import redis
from fastapi import HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import json
import os
from dotenv import load_dotenv
import logging
import time
import ipaddress
from typing import Optional, Dict, Any, Union, Callable, List
from functools import wraps

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Rate Limiting Configuration
MAX_ATTEMPTS = 5  # Maximum login attempts before lockout
LOCKOUT_TIME = 300  # Lockout time in seconds (5 minutes)
ATTEMPT_EXPIRY = 3600  # Time to keep track of attempts (1 hour)

# Progressive delay configuration (in seconds)
PROGRESSIVE_DELAYS = {
    1: 0,     # First attempt - no delay
    2: 2,     # Second attempt - 2 second delay
    3: 5,     # Third attempt - 5 second delay
    4: 10,    # Fourth attempt - 10 second delay
    5: 30     # Fifth attempt - 30 second delay
}

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    redis_client.ping()  # Test connection
    logger.info(f"✅ Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.error(f"❌ Failed to connect to Redis: {str(e)}")
    raise

class RateLimiter:
    """
    Rate limiting utility that can limit by IP address or username.
    
    Features:
    - IP-based and username-based rate limiting
    - Progressive delays for failed attempts
    - Lockout after max attempts
    - Detailed logging and history tracking
    - Proper TTL handling with first-attempt expiry setting
    - Forwarded IP and proxy support
    """
    
    @staticmethod
    def get_key(identifier: str, key_type: str, by_ip: bool = False) -> str:
        """
        Generate Redis key for rate limiting
        
        Args:
            identifier: Username or IP address
            key_type: Type of key (attempts, log, etc.)
            by_ip: Whether this is an IP-based key
            
        Returns:
            Redis key string
        """
        prefix = "ipratelimit" if by_ip else "ratelimit"
        return f"{prefix}:{key_type}:{identifier}"

    @staticmethod
    def get_client_ip(request: Request) -> str:
        """
        Extract client IP address with support for reverse proxies
        
        Args:
            request: FastAPI request object
            
        Returns:
            Client IP address
        """
        # First check X-Forwarded-For header (for proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Get the first IP in case of multiple proxies
            ip = forwarded_for.split(",")[0].strip()
            try:
                # Validate it's a proper IP address
                ipaddress.ip_address(ip)
                return ip
            except ValueError:
                # If not a valid IP, fall back to client.host
                pass
                
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"

    @staticmethod
    def get_attempt_count(identifier: str, by_ip: bool = False) -> int:
        """
        Get the number of attempts for an identifier
        
        Args:
            identifier: Username or IP address
            by_ip: Whether to use IP-based keys
            
        Returns:
            Number of attempts (0 if no attempts)
        """
        key = RateLimiter.get_key(identifier, "attempts", by_ip)
        count = redis_client.get(key)
        return int(count) if count else 0
        
    @staticmethod
    def get_time_to_reset(identifier: str, by_ip: bool = False) -> int:
        """
        Get time remaining until attempt counter resets (in seconds)
        
        Args:
            identifier: Username or IP address
            by_ip: Whether to use IP-based keys
            
        Returns:
            Seconds until reset (0 if no TTL or key doesn't exist)
        """
        key = RateLimiter.get_key(identifier, "attempts", by_ip)
        ttl = redis_client.ttl(key)
        return max(0, ttl)  # Return 0 if ttl is -1 (no expiry) or -2 (key doesn't exist)

    @staticmethod
    def record_attempt(
        identifier: str, 
        request: Request, 
        success: bool, 
        by_ip: bool = False,
        username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a login attempt
        
        Args:
            identifier: Username or IP address
            request: FastAPI request object
            success: Whether the attempt was successful
            by_ip: Whether to use IP-based keys
            username: Optional username (for IP-based tracking)
            
        Returns:
            Dict with attempt data
        """
        attempt_key = RateLimiter.get_key(identifier, "attempts", by_ip)
        log_key = RateLimiter.get_key(identifier, "log", by_ip)

        # Get current attempt count
        current_attempts = RateLimiter.get_attempt_count(identifier, by_ip)
        
        # Get client info
        ip_address = RateLimiter.get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Format timestamp for readable logs
        timestamp = datetime.utcnow()
        formatted_time = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        # Record attempt details
        attempt_data = {
            "timestamp": timestamp.isoformat(),
            "formatted_time": formatted_time,
            "ip": ip_address,
            "user_agent": user_agent,
            "success": success,
            "attempt_number": current_attempts + 1
        }
        
        # Add username to IP-based records and vice versa for cross-referencing
        if by_ip and username:
            attempt_data["username"] = username
        elif not by_ip:
            attempt_data["identifier"] = identifier  # Username

        # Use pipeline for atomic operations
        pipeline = redis_client.pipeline()
        
        # Increment attempt counter
        pipeline.incr(attempt_key)
        
        # Set or update expiry - CRITICAL: Only set TTL if it doesn't exist
        # This ensures we keep the original 1-hour window from first attempt
        pipeline.ttl(attempt_key)  # Get current TTL
        
        # Push to log
        pipeline.rpush(log_key, json.dumps(attempt_data))
        pipeline.expire(log_key, ATTEMPT_EXPIRY)  # Always update log expiry
        
        # Execute pipeline
        result = pipeline.execute()
        current_ttl = result[1]  # Get TTL result from pipeline
        
        # If TTL is -1 (no expiry) or -2 (key doesn't exist), set it
        # This ensures TTL is only set on first attempt or if it has expired
        if current_ttl < 0:
            redis_client.expire(attempt_key, ATTEMPT_EXPIRY)
            logger.info(f"⏱️ Set TTL for {attempt_key} to {ATTEMPT_EXPIRY}s")
        
        # Log the attempt with detailed information
        id_type = "IP" if by_ip else "User"
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(f"🔐 LOGIN ATTEMPT [{status}] | {id_type}: {identifier} | IP: {ip_address} | Attempt #{current_attempts + 1} | Time: {formatted_time}")
        
        # Add more detailed logging for security monitoring
        if not success:
            next_attempt_info = ""
            if current_attempts + 1 >= MAX_ATTEMPTS:
                next_attempt_info = f" | ACCOUNT WILL BE LOCKED for {LOCKOUT_TIME/60:.1f} minutes"
            elif current_attempts + 1 > 1:  # Only mention delay for attempts after the first
                delay = PROGRESSIVE_DELAYS.get(current_attempts + 1, PROGRESSIVE_DELAYS[MAX_ATTEMPTS])
                if delay > 0:
                    next_attempt_info = f" | DELAY APPLIED: {delay}s for next attempt"
            
            logger.warning(f"⚠️ FAILED LOGIN | {id_type}: {identifier} | IP: {ip_address} | Attempt #{current_attempts + 1}/{MAX_ATTEMPTS}{next_attempt_info}")
        
        return attempt_data

    @staticmethod
    def check_rate_limit(
        identifier: str, 
        request: Request, 
        by_ip: bool = False,
        username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if the identifier is rate limited
        
        Args:
            identifier: Username or IP address
            request: FastAPI request object
            by_ip: Whether to use IP-based keys
            username: Optional username (for IP-based tracking)
            
        Returns:
            Dict with rate limit info
            
        Raises:
            HTTPException: If rate limited with 429 status code
        """
        # First increment the attempt counter - CRITICAL fix!
        # This ensures the counter advances even when rate limiting is applied
        attempt_key = RateLimiter.get_key(identifier, "attempts", by_ip)
        current_attempts = RateLimiter.get_attempt_count(identifier, by_ip)
        
        # Only increment if this isn't the first attempt (allow first attempt without delay)
        # We still track the first attempt when it happens in record_attempt
        if current_attempts > 0:
            # Increment the counter
            redis_client.incr(attempt_key)
            
            # Also log this attempt in the history
            log_key = RateLimiter.get_key(identifier, "log", by_ip)
            ip_address = RateLimiter.get_client_ip(request)
            user_agent = request.headers.get("user-agent", "unknown")
            timestamp = datetime.utcnow()
            formatted_time = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            # Record attempt details
            attempt_data = {
                "timestamp": timestamp.isoformat(),
                "formatted_time": formatted_time,
                "ip": ip_address,
                "user_agent": user_agent,
                "success": False,
                "attempt_number": current_attempts + 1,
                "rate_limited": True
            }
            
            # Add username to IP-based records and vice versa for cross-referencing
            if by_ip and username:
                attempt_data["username"] = username
            elif not by_ip:
                attempt_data["identifier"] = identifier  # Username
            
            # Add to log
            redis_client.rpush(log_key, json.dumps(attempt_data))
            redis_client.expire(log_key, ATTEMPT_EXPIRY)  # Always update log expiry
            
            # Get the updated attempt count
            current_attempts = RateLimiter.get_attempt_count(identifier, by_ip)
        
        ip_address = RateLimiter.get_client_ip(request)
        id_type = "IP" if by_ip else "User"
        
        # Return attempt metadata for the response
        rate_limit_info = {
            "identifier": identifier,
            "identifier_type": "ip" if by_ip else "username",
            "current_attempts": current_attempts,
            "max_attempts": MAX_ATTEMPTS,
            "attempts_remaining": max(0, MAX_ATTEMPTS - current_attempts),
            "expiry_seconds": RateLimiter.get_time_to_reset(identifier, by_ip)
        }

        # First check if account is locked due to too many attempts
        if current_attempts >= MAX_ATTEMPTS:
            lockout_seconds = RateLimiter.get_time_to_reset(identifier, by_ip)
            minutes = lockout_seconds // 60
            seconds = lockout_seconds % 60
            
            time_format = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
            logger.warning(f"🔒 ACCOUNT LOCKED | {id_type}: {identifier} | IP: {ip_address} | Reason: Exceeded {MAX_ATTEMPTS} attempts | Unlock in: {time_format}")
            
            # Include username in response if provided
            extra_info = {}
            if username and by_ip:
                extra_info["username"] = username
            
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too many login attempts",
                    "status": "locked",
                    "lockout_time": lockout_seconds,
                    "message": f"Account temporarily locked. Please try again in {time_format}.",
                    "security_event": "account_lockout",
                    "rate_limit_info": rate_limit_info,
                    **extra_info
                }
            )

        # Apply progressive delay ONLY for attempts after the first one
        if current_attempts > 1:
            delay = PROGRESSIVE_DELAYS.get(current_attempts, PROGRESSIVE_DELAYS[MAX_ATTEMPTS])
            
            # Only apply delay if it's greater than 0 seconds
            if delay > 0:
                logger.info(f"⏱️ RATE LIMIT DELAY | {id_type}: {identifier} | IP: {ip_address} | Attempt #{current_attempts}/{MAX_ATTEMPTS} | Delay: {delay}s | Attempts remaining: {MAX_ATTEMPTS - current_attempts}")
                
                # Include username in response if provided
                extra_info = {}
                if username and by_ip:
                    extra_info["username"] = username
                    
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Please wait before trying again",
                        "status": "delayed",
                        "delay": delay,
                        "attempts_remaining": MAX_ATTEMPTS - current_attempts,
                        "message": f"Please wait {delay} seconds before trying again. {MAX_ATTEMPTS - current_attempts} attempts remaining before lockout.",
                        "security_event": "progressive_delay",
                        "rate_limit_info": rate_limit_info,
                        **extra_info
                    }
                )
        
        logger.info(f"✅ RATE LIMIT CHECK PASSED | {id_type}: {identifier} | IP: {ip_address} | Attempt: {current_attempts + 1}/{MAX_ATTEMPTS}")
        return rate_limit_info

    @staticmethod
    def reset_attempts(
        identifier: str, 
        by_ip: bool = False, 
        reset_logs: bool = False
    ) -> Dict[str, Any]:
        """
        Reset attempt counter after successful login
        
        Args:
            identifier: Username or IP address
            by_ip: Whether to use IP-based keys
            reset_logs: Whether to reset logs as well
            
        Returns:
            Dict with reset status
        """
        attempt_key = RateLimiter.get_key(identifier, "attempts", by_ip)
        log_key = RateLimiter.get_key(identifier, "log", by_ip)
        
        # Get the history before we potentially delete it
        history = RateLimiter.get_attempt_history(identifier, by_ip)
        history_count = len(history["attempts"]) if isinstance(history, dict) and "attempts" in history else 0
        
        # Delete the attempt counter
        deleted = redis_client.delete(attempt_key)
        
        # Optionally delete the history log
        if reset_logs:
            redis_client.delete(log_key)
            logger.info(f"🧹 LOGS CLEARED | {'IP' if by_ip else 'User'}: {identifier} | Deleted {history_count} log entries")
        
        logger.info(f"🔓 RATE LIMIT RESET | {'IP' if by_ip else 'User'}: {identifier} | Attempt counters reset after successful login | Previous attempts: {history_count}")
        return {"success": True, "previous_attempts": history_count}

    @staticmethod
    def get_attempt_history(identifier: str, by_ip: bool = False) -> Dict[str, Any]:
        """
        Get login attempt history for an identifier
        
        Args:
            identifier: Username or IP address
            by_ip: Whether to use IP-based keys
            
        Returns:
            Dict with attempt history and summary
        """
        log_key = RateLimiter.get_key(identifier, "log", by_ip)
        logs = redis_client.lrange(log_key, 0, -1)
        history = [json.loads(log) for log in logs]
        
        # Add a summary for easier analysis
        failed_count = sum(1 for entry in history if not entry.get("success", False))
        success_count = len(history) - failed_count
        
        id_type = "IP" if by_ip else "User"
        logger.info(f"📜 HISTORY RETRIEVED | {id_type}: {identifier} | Total attempts: {len(history)} | Successful: {success_count} | Failed: {failed_count}")
        
        return {
            "attempts": history,
            "total": len(history),
            "successful": success_count,
            "failed": failed_count,
            "time_to_reset": RateLimiter.get_time_to_reset(identifier, by_ip)
        }

# Create reusable dependency for FastAPI
def ip_rate_limit(max_attempts: int = MAX_ATTEMPTS) -> Callable:
    """
    FastAPI dependency for IP-based rate limiting
    
    Usage:
        @app.post("/login")
        async def login(request: Request, rate_limit: dict = Depends(ip_rate_limit())):
            # Your login logic here
    
    Args:
        max_attempts: Override the default max attempts
        
    Returns:
        Dependency function for FastAPI
    """
    def dependency(request: Request) -> Dict[str, Any]:
        client_ip = RateLimiter.get_client_ip(request)
        return RateLimiter.check_rate_limit(client_ip, request, by_ip=True)
    
    return dependency

# Create reusable decorator for Flask or other frameworks
def limit_by_ip(func: Callable) -> Callable:
    """
    Decorator for IP-based rate limiting in Flask or other frameworks
    
    Usage:
        @app.route("/login", methods=["POST"])
        @limit_by_ip
        def login():
            # Your login logic here
    
    Args:
        func: The function to decorate
        
    Returns:
        Decorated function
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        request = kwargs.get("request")
        if not request:
            # Try to find request in args
            for arg in args:
                if hasattr(arg, "client") and hasattr(arg, "headers"):
                    request = arg
                    break
        
        if not request:
            logger.error("❌ Request object not found in function arguments")
            return func(*args, **kwargs)
        
        client_ip = RateLimiter.get_client_ip(request)
        
        try:
            RateLimiter.check_rate_limit(client_ip, request, by_ip=True)
            return func(*args, **kwargs)
        except HTTPException as e:
            # Convert to appropriate response for the framework
            response_data = e.detail
            response_data["status_code"] = e.status_code
            # For FastAPI, return the HTTPException
            # For Flask or other frameworks, you might need a different response
            return JSONResponse(
                status_code=e.status_code,
                content=response_data
            )
    
    return wrapper 