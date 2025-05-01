# src/api/routes/auth.py
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
import os
from passlib.context import CryptContext
import uuid
import random
import logging
import string

import secrets
from .models import CompanyCreate, CompanyResponse, UserCreate, Token, UserLogin, UserResponse, PasswordReset, PasswordResetRequest, SessionCreate, SessionResponse
import jwt
from typing import Optional, List
import traceback
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from bson import ObjectId
from api.database import get_database
from api.models.company import Company
from api.core.redis_config import RateLimiter

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Initialize router
router = APIRouter(prefix="/auth", tags=["authentication"])

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

logger.info(f"JWT SECRET_KEY type: {(SECRET_KEY)}") 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    company_id: str

# MongoDB connection
MONGODB_HOST = os.getenv("MONGODB_HOST", "102.22.15.141") 
MONGODB_PORT = int(os.getenv("MONGODB_PORT", 37037))
#DATABASE_NAME_USERS = os.getenv("DATABASE_NAME_USERS")
DATABASE_NAME_USERS = "users"
client = MongoClient(MONGODB_HOST, MONGODB_PORT)
db = client[DATABASE_NAME_USERS]
users_collection = db["users"]
companies_collection = db["companies"] 
# Add this near your other collection definitions
sessions_collection = db["sessions"]  # For tracking user sessions
conversations_collection = db["conversations"]  # For storing conversation history # Add companies collection

# Make sure DATABASE_NAME is properly defined
if not DATABASE_NAME_USERS or not isinstance(DATABASE_NAME_USERS, str):
    # Fallback to a default name if environment variable is not set
    DATABASE_NAME_USERS = "users"
    
# Create a custom error handler that logs errors and returns nice messages
class APIError(Exception):
    def __init__(self, status_code: int, detail: str, log_error=True):
        self.status_code = status_code
        self.detail = detail
        if log_error:
            logger.error(f"API Error: {detail}")
        super().__init__(self.detail)

# Connect to MongoDB with better error handling
try:
    client = MongoClient(host=MONGODB_HOST, port=MONGODB_PORT, serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    logger.info(f"Successfully connected to MongoDB at {MONGODB_HOST}:{MONGODB_PORT}")
    
    db = client[DATABASE_NAME_USERS]
    users_collection = db["users"]
    companies_collection = db["companies"]
except Exception as e:
    error_msg = f"Failed to connect to MongoDB: {str(e)}"
    logger.error(error_msg)
    logger.error(traceback.format_exc())
    # Still define the collections to prevent errors when importing the module
    # They will fail during runtime which we'll handle with try/except
    db = client.get_database(DATABASE_NAME_USERS)
    users_collection = db["users"]
    companies_collection = db["companies"]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ===== IMPORTANT: Define get_current_user before any functions or routes that use it =====
async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_database)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Log the token for debugging (don't do this in production)
        logger.info(f"Token type: {type(token)}, First few chars: {token[:15]}...")
        
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"Token decoded successfully: {payload}")
        
        # Extract user information
        user_id = payload.get("sub")
        if user_id is None:
            logger.error("Token missing 'sub' field")
            raise credentials_exception
        
        # Find the user in the database
        user = await db["users"].find_one({"_id": user_id})
        if user is None:
            # For testing purposes, if the user ID is test_user_id, return a mock user
            if user_id == "test_user_id":
                return {
                    "_id": "test_user_id",
                    "email": "test@example.com",
                    "username": "testuser",
                    "hashed_password": "hashed_password_here",
                    "full_name": "Test User",
                    "company_id": "test_company_id",
                    "company_code": "TEST123",
                    "company_name": "Test Company",
                    "created_at": datetime.now(timezone.utc),
                    "is_active": True,
                    "is_verified": True
                }
            logger.error(f"User with ID {user_id} not found in database")
            raise credentials_exception
        
        logger.info(f"User authenticated: {user['username']}")
        return user
        
    except Exception as e:
        logger.error(f"Error authenticating: {str(e)}")
        logger.error(traceback.format_exc())
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
# ===== End of get_current_user definition =====

def get_password_hash(password):
    return pwd_context.hash(password)

# Function to generate company code
def generate_company_code(length=8):
    """Generate a random company code with letters and numbers"""
    characters = string.ascii_uppercase + string.digits
    code = ''.join(random.choice(characters) for _ in range(length))
    
    # Ensure code is unique
    while companies_collection.find_one({"company_code": code}):
        code = ''.join(random.choice(characters) for _ in range(length))
        
    return code

def create_session(user_id: str, request: Request) -> dict:
    """Create a new session for a user"""
    session_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    # Get client information
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    session_data = {
        "_id": session_id,
        "user_id": user_id,
        "created_at": created_at,
        "last_active": created_at,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "is_active": True
    }
    
    sessions_collection.insert_one(session_data)
    logger.info(f"🔑 Created new session {session_id} for user {user_id}")
    
    return session_data

def update_session_activity(session_id: str) -> None:
    """Update the last_active timestamp for a session"""
    sessions_collection.update_one(
        {"_id": session_id},
        {"$set": {"last_active": datetime.utcnow()}}
    )

def end_session(session_id: str) -> None:
    """Mark a session as inactive"""
    sessions_collection.update_one(
        {"_id": session_id},
        {"$set": {"is_active": False}}
    )
    logger.info(f"Ended session {session_id}")

def get_user_sessions(user_id: str) -> List[dict]:
    """Get all active sessions for a user"""
    return list(sessions_collection.find(
        {"user_id": user_id, "is_active": True}
    ))


@router.get("/db-health")
async def check_db_health():
    """Check if MongoDB connection is working"""
    try:
        # Ping the database
        client.admin.command('ping')
        return {"status": "MongoDB connection is working", "connected": True}
    except Exception as e:
        return {
            "status": "MongoDB connection failed", 
            "error": str(e),
            "connected": False,
            "host": MONGODB_HOST,
            "port": MONGODB_PORT,
            "database": DATABASE_NAME_USERS
        }
# Company management endpoints
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(company: CompanyCreate):
    """Create a new company and generate its unique code"""
    # Check if company with same name exists
    if companies_collection.find_one({"name": company.name}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this name already exists"
        )
    
    # Generate a unique company code
    company_code = generate_company_code()
    company_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    company_data = {
        "_id": company_id,
        "name": company.name,
        "description": company.description,
        "company_code": company_code,
        "admin_email": company.admin_email,
        "created_at": created_at,
        "is_active": True
    }
    
    # Insert into MongoDB
    companies_collection.insert_one(company_data)
    
    return {
        "id": company_id,
        "name": company.name,
        "company_code": company_code,
        "description": company.description,
        "created_at": created_at
    }

# Modified user registration to accept empty company_code
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db = Depends(get_database)):
    try:
        # Check if email already exists
        if await db["users"].find_one({"email": user.email}):
            raise APIError(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        if await db["users"].find_one({"username": user.username}):
            raise APIError(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Initialize company-related variables
        company = None
        company_id = "None"
        company_name = "None"
        is_verified = False
        
        # Validate company code if provided and not empty
        if user.company_code and user.company_code.strip():  # Check if code exists and is not just whitespace
            company = await db["companies"].find_one({"company_code": user.company_code})
            if not company:
                raise APIError(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid company code"
                )
            company_id = str(company["_id"])
            company_name = company["name"]
            is_verified = True
        else:
            # Treat empty string same as no company code
            user.company_code = "None"
        
        # Create user
        user_id = str(uuid.uuid4())
        created_at = datetime.utcnow()
        
        # Hash password with error handling
        try:
            hashed_password = get_password_hash(user.password)
        except Exception as e:
            logger.error(f"Password hashing error: {str(e)}")
            raise APIError(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing password"
            )
        
        user_data = {
            "_id": user_id,
            "email": user.email,
            "username": user.username,
            "hashed_password": hashed_password,
            "full_name": user.full_name,
            "company_id": company_id,
            "company_code": user.company_code,  # Will be None if empty string was provided
            "company_name": company_name,
            "created_at": created_at,
            "is_active": True,
            "is_verified": is_verified
        }
        
        # Insert into MongoDB
        result = await db["users"].insert_one(user_data)
        logger.info(f"Created new user: {user.username}")
        
        # Return user data
        response = {
            "id": user_id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "company_id": company_id,
            "company_name": company_name,
            "created_at": created_at,
            "is_verified": is_verified,
            "warnings": ["Invalid company code provided"] if user.company_code and not company else None
        }
        return response
    except APIError:
        # Re-raise API errors to be caught by the middleware
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        logger.error(traceback.format_exc())
        raise APIError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}"
        )

# Verify company code for users who registered without one
@router.post("/verify-company", response_model=UserResponse)
async def verify_company_code(username: str, company_code: str, db = Depends(get_database)):
    # Find the user
    user = await db["users"].find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already verified
    if user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already verified with a company code"
        )
    
    # Validate company code
    company = await db["companies"].find_one({"company_code": company_code})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid company code"
        )
    
    # Update user with company info
    await db["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "company_id": str(company["_id"]),
                "company_code": company_code,
                "is_verified": True
            }
        }
    )
    
    # Get updated user
    updated_user = await db["users"].find_one({"_id": user["_id"]})
    
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "username": updated_user["username"],
        "full_name": updated_user.get("full_name"),
        "company_id": updated_user["company_id"],
        "company_name": company["name"],
        "created_at": updated_user["created_at"],
        "is_verified": updated_user["is_verified"]
    }


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Fixed token creation function
def create_access_token(data: dict, expires_delta: timedelta = None):
    try:
        to_encode = data.copy()
        
        # Calculate expiration time
        expire_datetime = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        
        # Convert datetime to Unix timestamp (integer seconds since epoch)
        expire_timestamp = int(expire_datetime.timestamp())
        
        # Add the expiration as an integer timestamp
        to_encode.update({"exp": expire_timestamp})
        
        # Log for debugging
        logger.info(f"Creating JWT with payload: {to_encode}")
        logger.info(f"Expiration timestamp: {expire_timestamp} ({expire_datetime})")
        
        # Create the token
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        # Make sure token is returned as a string
        if isinstance(encoded_jwt, bytes):
            encoded_jwt = encoded_jwt.decode('utf-8')
        
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating JWT token: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating authentication token: {str(e)}"
        )
@router.post("/login", response_model=Token)
async def login(form_data: UserLogin, request: Request, db = Depends(get_database)):
    try:
        # Get client IP for tracking
        client_ip = RateLimiter.get_client_ip(request)
        
        try:
            # Step 1: Check IP-based rate limit first (protects against attackers trying different usernames)
            ip_limit_info = RateLimiter.check_rate_limit(client_ip, request, by_ip=True, username=form_data.username)
            
            # Step 2: Check username-based rate limit (protects specific accounts)
            username_limit_info = RateLimiter.check_rate_limit(form_data.username, request)
            
            # If we got here, no rate limiting was applied, so proceed with login attempt
            
            # Find user by username
            user = await db["users"].find_one({"username": form_data.username})
            if not user:
                # Record failed attempt for both IP and username
                RateLimiter.record_attempt(client_ip, request, success=False, by_ip=True, username=form_data.username)
                RateLimiter.record_attempt(form_data.username, request, success=False)
                
                logger.warning(f"Login failed for user '{form_data.username}': User not found.")
                raise APIError(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password"
                )
            
            # Verify password
            if not verify_password(form_data.password, user["hashed_password"]):
                # Record failed attempt for both IP and username
                RateLimiter.record_attempt(client_ip, request, success=False, by_ip=True, username=form_data.username)
                RateLimiter.record_attempt(form_data.username, request, success=False)
                
                logger.warning(f"Login failed for user '{form_data.username}': Incorrect password.")
                raise APIError(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password"
                )
            
            # Verify company code
            company = None
            company_id_for_token = "None" # Default
            if form_data.company_code:
                company = await db["companies"].find_one({"company_code": form_data.company_code})
                if not company:
                    # Record failed attempt
                    RateLimiter.record_attempt(form_data.username, request, success=False)
                    logger.warning(f"Login failed for user '{form_data.username}': Invalid company code '{form_data.company_code}'.")
                    raise APIError(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid company code")
    
                user_company_id = user.get("company_id")
                if user_company_id and user_company_id != "None":
                    if user_company_id != str(company["_id"]):
                        # Record failed attempt
                        RateLimiter.record_attempt(form_data.username, request, success=False)
                        logger.warning(f"Login failed for user '{form_data.username}': User associated with company {user_company_id}, tried login with company {str(company['_id'])}.")
                        raise APIError(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authorized for this company")
                    else:
                        company_id_for_token = str(company["_id"])
                else:
                    logger.info(f"Associating user '{user['username']}' with company '{company['name']}' during login.")
                    await db["users"].update_one(
                        {"_id": user["_id"]},
                        {"$set": {
                            "company_id": str(company["_id"]),
                            "company_code": form_data.company_code,
                            "company_name": company["name"],
                            "is_verified": True
                        }}
                    )
                    company_id_for_token = str(company["_id"])
            else:
                user_company_id = user.get("company_id")
                if user_company_id and user_company_id != "None":
                    existing_company = await db["companies"].find_one({"_id": user_company_id})
                    if existing_company:
                        company_id_for_token = user_company_id
                        logger.info(f"User '{form_data.username}' logged in without company code, already associated with {existing_company['name']}.")
                    else:
                        logger.warning(f"User '{form_data.username}' associated with non-existent company ID {user_company_id}. Treating as unassociated.")
                        company_id_for_token = "None"
                else:
                    logger.info(f"User '{form_data.username}' logged in without a company code (not yet associated).")
                    company_id_for_token = "None"
    
            # Verification successful - Create session
            session = create_session(str(user["_id"]), request)
    
            # Record successful login attempt for both IP and username
            RateLimiter.record_attempt(client_ip, request, success=True, by_ip=True, username=form_data.username)
            RateLimiter.record_attempt(form_data.username, request, success=True)
            
            # Reset attempt counters after successful login
            RateLimiter.reset_attempts(client_ip, by_ip=True)
            RateLimiter.reset_attempts(form_data.username)
    
            # Create access token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={
                    "sub": str(user["_id"]),
                    "username": user["username"],
                    "company_id": company_id_for_token,
                    "session_id": session["_id"]
                },
                expires_delta=access_token_expires
            )
    
            logger.info(f"👤 LOGIN SUCCESSFUL | User: {user['username']} | IP: {client_ip} | Session: {session['_id']}")
            
            # Add rate limit info to response for observability (optional - remove in production if sensitive)
            rate_limit_info = {
                "ip_limit": ip_limit_info,
                "username_limit": username_limit_info
            }
    
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": str(user["_id"]),
                "username": user["username"],
                "company_id": company_id_for_token,
                "session_id": session["_id"],
                "rate_limit_info": rate_limit_info  # Optional - remove in production if sensitive
            }
                
        except HTTPException as rate_limit_error:
            # Pass rate limiting errors directly to the client with proper status code
            logger.info(f"Rate limit applied: {rate_limit_error.detail}")
            raise rate_limit_error
            
    except HTTPException as http_ex:
        # This catches both rate limit exceptions and other HTTP exceptions
        # Just re-raise to let FastAPI handle it with the proper status code
        raise http_ex
    except APIError as api_err:
        # Convert APIError to HTTPException
        raise HTTPException(status_code=api_err.status_code, detail=api_err.detail)
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error during login for user '{form_data.username}': {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login."
        )

# Add endpoint to get login attempt history
@router.get("/login-history/{username}", response_model=dict)
async def get_login_history(
    username: str,
    current_user: dict = Depends(get_current_user)
):
    """Get login attempt history for a user (admin or self only)"""
    # Check if user is requesting their own history or is an admin
    if current_user["username"] != username:  # Add admin check here if needed
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's login history"
        )
    
    # Get enhanced history with summary information
    history = RateLimiter.get_attempt_history(username)
    
    # Calculate time remaining for lockout if applicable
    current_attempts = RateLimiter.get_attempt_count(username)
    status = "normal"
    
    if current_attempts >= MAX_ATTEMPTS: # type: ignore
        time_remaining = RateLimiter.get_time_to_reset(username)
        minutes = time_remaining // 60
        seconds = time_remaining % 60
        time_format = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
        
        status = {
            "state": "locked",
            "time_remaining": time_remaining,
            "formatted_time": time_format,
            "message": f"Account locked. Unlock in {time_format}"
        }
    elif current_attempts > 0:
        status = {
            "state": "warned",
            "attempts": current_attempts,
            "remaining": MAX_ATTEMPTS - current_attempts, # type: ignore
            "next_delay": PROGRESSIVE_DELAYS.get(current_attempts + 1, PROGRESSIVE_DELAYS[MAX_ATTEMPTS]), # type: ignore
            "message": f"Account active. {MAX_ATTEMPTS - current_attempts} attempts remaining before lockout." # type: ignore
        }
    else:
        status = {
            "state": "normal",
            "message": "Account active. No failed login attempts."
        }
    
    # Return the full history with additional security information
    return {
        "username": username,
        "history": history,
        "status": status,
        "rate_limit_info": {
            "max_attempts": MAX_ATTEMPTS, # type: ignore
            "current_attempts": current_attempts,
            "lockout_time": LOCKOUT_TIME, # type: ignore
            "attempt_expiry": ATTEMPT_EXPIRY, # type: ignore
            "progressive_delays": PROGRESSIVE_DELAYS # type: ignore
        }
    }

# Get current user endpoint with better error handling
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get information about the currently authenticated user"""
    try:
        logger.info(f"Getting info for user: {current_user['username']}")
        
        # Make sure to handle potential missing fields
        company_id = current_user.get("company_id", "none")
        company_name = current_user.get("company_name", "none")
        is_verified = current_user.get("is_verified", False)
        
        # Format creation date properly
        created_at = current_user.get("created_at", datetime.utcnow())
        
        return {
            "id": str(current_user["_id"]),
            "email": current_user["email"],
            "username": current_user["username"],
            "full_name": current_user.get("full_name"),
            "company_id": company_id,
            "company_name": company_name,
            "created_at": created_at,
            "is_verified": is_verified
        }
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user info: {str(e)}"
        )

@router.get("/list-companies", response_model=List[CompanyResponse])
async def list_companies(current_user: dict = Depends(get_current_user)):
    """List all companies (admin only)"""
    # In a real app, you'd check if the user is an admin
    companies = list(companies_collection.find({"is_active": True}))
    
    # Format response
    return [
        {
            "id": str(company["_id"]),
            "name": company["name"],
            "company_code": company["company_code"],
            "description": company.get("description"),
            "created_at": company["created_at"]
        }
        for company in companies
    ]

@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get details of a specific company"""
    # Check if user belongs to the company
    if current_user["company_id"] != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this company"
        )
    
    company = companies_collection.find_one({"_id": company_id})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    return {
        "id": str(company["_id"]),
        "name": company["name"],
        "company_code": company["company_code"],
        "description": company.get("description"),
        "created_at": company["created_at"]
    }

# Add a test endpoint to check token
@router.get("/test-token")
async def test_token(request: Request):
    """Endpoint to debug token issues"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return {"error": "No Authorization header found"}
    
    try:
        # Extract token
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return {"error": "Invalid authentication scheme"}
        
        # Try to decode (without validation)
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check if token structure is correct
        return {
            "token_type": "Valid token structure",
            "payload": decoded,
            "exp_valid": datetime.fromtimestamp(decoded["exp"]) > datetime.utcnow() if "exp" in decoded else False,
            "has_user_id": "sub" in decoded
        }
    except Exception as e:
        return {"error": f"Token parsing error: {str(e)}"}


# Generate a reset token
def generate_reset_token():
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)  # 32 bytes of randomness

# Request password reset endpoint
@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: PasswordResetRequest):
    """Request a password reset by providing email"""
    try:
        # Find user by email
        user = users_collection.find_one({"email": request.email})
        if not user:
            # Don't reveal if email exists or not (security best practice)
            logger.info(f"Password reset requested for non-existent email: {request.email}")
            return {"message": "If your email is registered, you will receive a password reset link"}
        
        # Generate a reset token
        reset_token = generate_reset_token()
        expiration = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Store token in database
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expiry": expiration
                }
            }
        )
        
        # In a real application, send an email with the reset link
        # For now, we'll just log it and return it in the response
        reset_link = f"https://yourdomain.com/reset-password?token={reset_token}"
        logger.info(f"Password reset link for {request.email}: {reset_link}")
        
        # For development purposes only - return the token (in production you would email it)
        return {
            "message": "If your email is registered, you will receive a password reset link",
            "dev_reset_link": reset_link  # Remove this in production!
        }
    except Exception as e:
        logger.error(f"Error processing password reset request: {str(e)}")
        logger.error(traceback.format_exc())
        # Still return success to not reveal if email exists
        return {"message": "If your email is registered, you will receive a password reset link"}

# Reset password endpoint
@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(reset_data: PasswordReset):
    """Reset password using the token received by email"""
    try:
        # Find user by reset token
        user = users_collection.find_one({
            "reset_token": reset_data.token,
            "reset_token_expiry": {"$gt": datetime.now(timezone.utc)}  # Token must not be expired
        })
        
        if not user:
            raise APIError(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Hash the new password
        hashed_password = get_password_hash(reset_data.new_password)
        
        # Update user with new password and remove reset token
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_password
                },
                "$unset": {
                    "reset_token": "",
                    "reset_token_expiry": ""
                }
            }
        )
        
        logger.info(f"Password reset successful for user: {user['username']}")
        
        return {"message": "Password has been reset successfully"}
    except APIError:
        # Re-raise API errors to be caught by the middleware
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        logger.error(traceback.format_exc())
        raise APIError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.get("/security-status")
async def get_security_status(current_user: dict = Depends(get_current_user)):
    """Get system security status and rate limiting information (admin only)"""
    # Check if the user is an admin (implement proper admin check in production)
    is_admin = current_user.get("is_admin", False)
    
    if not is_admin:
        # For now, we'll allow any authenticated user to see basic status
        # In production, you should restrict this to admins
        logger.warning(f"Non-admin user '{current_user['username']}' accessed security status")
    
    try:
        # Check Redis connection
        redis_status = "online"
        try:
            ping_result = redis_client.ping() # type: ignore
            if not ping_result:
                redis_status = "degraded"
        except Exception as e:
            redis_status = f"offline: {str(e)}"
        
        # Get all rate limited patterns
        username_pattern = RateLimiter.get_key("*", "attempts")
        ip_pattern = RateLimiter.get_key("*", "attempts", by_ip=True)
        
        username_keys = redis_client.keys(username_pattern) # type: ignore
        ip_keys = redis_client.keys(ip_pattern) # type: ignore
        
        # Get rate limited usernames
        username_limits = []
        for key in username_keys:
            parts = key.split(":")
            if len(parts) >= 3:
                username = parts[2]
                attempts = redis_client.get(key) # type: ignore
                ttl = redis_client.ttl(key) # type: ignore
                
                if attempts and int(attempts) > 0:
                    username_limits.append({
                        "username": username,
                        "attempts": int(attempts),
                        "ttl_seconds": ttl,
                        "status": "locked" if int(attempts) >= MAX_ATTEMPTS else "delayed" # type: ignore
                    })
        
        # Get rate limited IPs
        ip_limits = []
        for key in ip_keys:
            parts = key.split(":")
            if len(parts) >= 3:
                ip = parts[2]
                attempts = redis_client.get(key) # type: ignore
                ttl = redis_client.ttl(key) # type: ignore
                
                if attempts and int(attempts) > 0:
                    ip_limits.append({
                        "ip": ip,
                        "attempts": int(attempts),
                        "ttl_seconds": ttl,
                        "status": "locked" if int(attempts) >= MAX_ATTEMPTS else "delayed" # type: ignore
                    })
        
        # Sort by attempts (descending)
        username_limits.sort(key=lambda x: x["attempts"], reverse=True)
        ip_limits.sort(key=lambda x: x["attempts"], reverse=True)
        
        # Calculate statistics
        locked_usernames = sum(1 for item in username_limits if item["status"] == "locked") 
        locked_ips = sum(1 for item in ip_limits if item["status"] == "locked")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system_status": {
                "redis": redis_status,
                "rate_limiting": "active" if redis_status == "online" else "degraded"
            },
            "rate_limiting": {
                "config": {
                    "max_attempts": MAX_ATTEMPTS, # type: ignore
                    "lockout_time_seconds": LOCKOUT_TIME, # type: ignore
                    "attempt_expiry_seconds": ATTEMPT_EXPIRY, # type: ignore
                    "progressive_delays": PROGRESSIVE_DELAYS # type: ignore
                },
                "username_limits": username_limits,
                "ip_limits": ip_limits,
                "stats": {
                    "total_limited_usernames": len(username_limits),
                    "total_limited_ips": len(ip_limits),
                    "locked_usernames": locked_usernames,
                    "locked_ips": locked_ips
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting security status: {str(e)}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system_status": {
                "redis": "error",
                "rate_limiting": "error"
            },
            "error": str(e)
        }
    
