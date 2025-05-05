import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query, Path
from pydantic import BaseModel, validator, Field
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import pymysql
import pymysql.cursors
from api.database import get_database
from api.routes.auth import get_current_user, get_company_db_connection
from api.core.redis_cache import generate_cache_key, get_cached_data, set_cached_data, invalidate_cache, get_cache_stats

# Set up logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/call-records", tags=["call_records"])

# Constants for call direction
DIRECTION_INBOUND = "inbound"
DIRECTION_OUTBOUND = "outbound"
DIRECTION_INTERNAL = "internal"
DIRECTION_UNKNOWN = "unknown"

# Constants for call disposition
DISPOSITION_ANSWERED = "ANSWERED"
DISPOSITION_NO_ANSWER = "NO ANSWER"
DISPOSITION_BUSY = "BUSY"
DISPOSITION_FAILED = "FAILED"

# Helper functions
def determine_call_direction(src: str, dst: str) -> str:
    """
    Determine call direction based on the following rules:
    - Inbound: dst is ≤ 5 digits (internal extension)
    - Outbound: src is ≤ 5 digits (extension), dst is > 5 digits (external number)
    - Internal: src and dst are both ≤ 5 digits
    - Unknown: any other case
    """
    if not src or not dst:
        return DIRECTION_UNKNOWN
    
    src_is_extension = len(str(src).strip()) <= 5 and str(src).strip().isdigit()
    dst_is_extension = len(str(dst).strip()) <= 5 and str(dst).strip().isdigit()
    
    if src_is_extension and dst_is_extension:
        return DIRECTION_INTERNAL
    elif src_is_extension and not dst_is_extension:
        return DIRECTION_OUTBOUND
    elif not src_is_extension and dst_is_extension:
        return DIRECTION_INBOUND
    else:
        return DIRECTION_UNKNOWN

# Models for responses
class CallRecord(BaseModel):
    calldate: datetime
    clid: Optional[str] = None
    src: Optional[str] = None
    dst: Optional[str] = None
    dcontext: Optional[str] = None
    channel: Optional[str] = None
    dstchannel: Optional[str] = None
    lastapp: Optional[str] = None
    lastdata: Optional[str] = None
    duration: Optional[int] = None
    billsec: Optional[int] = None
    disposition: Optional[str] = None
    amaflags: Optional[int] = None
    accountcode: Optional[str] = None
    uniqueid: Optional[str] = None
    userfield: Optional[str] = None
    recordingfile: Optional[str] = None
    cnum: Optional[str] = None
    cnam: Optional[str] = None
    outbound_cnum: Optional[str] = None
    outbound_cnam: Optional[str] = None
    dst_cnam: Optional[str] = None
    did: Optional[str] = None
    direction: Optional[str] = None

class TimePeriod(BaseModel):
    """Time period representation for consistent responses"""
    start_date: str
    end_date: str
    total_days: int

class CallSummary(BaseModel):
    """Summary metrics for call data"""
    total_calls: int
    answered_calls: int
    no_answer_calls: int
    busy_calls: int
    failed_calls: int
    avg_duration: float
    avg_billsec: float
    answer_rate: float
    total_inbound: int
    total_outbound: int
    total_internal: int
    recording_percentage: float

class CallRecordsResponse(BaseModel):
    """Response model for call records listing"""
    time_period: TimePeriod
    summary: CallSummary
    records: List[CallRecord]
    total_count: int
    filtered_count: int
    
class CallMetricsResponse(BaseModel):
    """Response model for call metrics"""
    time_period: TimePeriod
    basic_metrics: Dict[str, Any]
    daily_distribution: List[Dict[str, Any]]
    hourly_distribution: List[Dict[str, Any]]
    disposition_distribution: List[Dict[str, Any]]
    direction_distribution: Dict[str, Any]  # New field for call direction metrics

# Helper function to calculate metrics from call records
def calculate_metrics(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not records:
        return {
            "total_calls": 0,
            "avg_duration": 0,
            "total_duration": 0,
            "avg_billsec": 0,
            "total_billsec": 0,
            "answered_calls": 0,
            "no_answer_calls": 0,
            "busy_calls": 0,
            "failed_calls": 0,
            "answer_percentage": 0,
            "unique_numbers": 0,
            "inbound_calls": 0,
            "outbound_calls": 0,
            "internal_calls": 0,
            "unknown_direction_calls": 0,
            "has_recording": 0,
            "recording_percentage": 0
        }
    
    # Add direction to each record
    for record in records:
        record['direction'] = determine_call_direction(record.get('src', ''), record.get('dst', ''))
    
    # Basic counts
    total_calls = len(records)
    answered_calls = sum(1 for r in records if r.get('disposition') == DISPOSITION_ANSWERED)
    no_answer_calls = sum(1 for r in records if r.get('disposition') == DISPOSITION_NO_ANSWER)
    busy_calls = sum(1 for r in records if r.get('disposition') == DISPOSITION_BUSY)
    failed_calls = sum(1 for r in records if r.get('disposition') == DISPOSITION_FAILED)
    
    # Direction counts
    inbound_calls = sum(1 for r in records if r.get('direction') == DIRECTION_INBOUND)
    outbound_calls = sum(1 for r in records if r.get('direction') == DIRECTION_OUTBOUND)
    internal_calls = sum(1 for r in records if r.get('direction') == DIRECTION_INTERNAL)
    unknown_direction_calls = sum(1 for r in records if r.get('direction') == DIRECTION_UNKNOWN)
    
    # Duration metrics
    total_duration = sum(r.get('duration', 0) for r in records)
    avg_duration = total_duration / total_calls if total_calls > 0 else 0
    
    # Billing metrics
    total_billsec = sum(r.get('billsec', 0) for r in records)
    avg_billsec = total_billsec / total_calls if total_calls > 0 else 0
    
    # Unique numbers
    unique_sources = set(r.get('src', '') for r in records if r.get('src'))
    
    # Recording metrics
    has_recording = sum(1 for r in records if r.get('recordingfile', ''))
    recording_percentage = (has_recording / total_calls * 100) if total_calls > 0 else 0
    
    # Direction-specific metrics
    inbound_answered = sum(1 for r in records if r.get('direction') == DIRECTION_INBOUND and r.get('disposition') == DISPOSITION_ANSWERED)
    outbound_answered = sum(1 for r in records if r.get('direction') == DIRECTION_OUTBOUND and r.get('disposition') == DISPOSITION_ANSWERED)
    
    inbound_answer_rate = (inbound_answered / inbound_calls * 100) if inbound_calls > 0 else 0
    outbound_answer_rate = (outbound_answered / outbound_calls * 100) if outbound_calls > 0 else 0
    
    inbound_avg_duration = sum(r.get('duration', 0) for r in records if r.get('direction') == DIRECTION_INBOUND) / inbound_calls if inbound_calls > 0 else 0
    outbound_avg_duration = sum(r.get('duration', 0) for r in records if r.get('direction') == DIRECTION_OUTBOUND) / outbound_calls if outbound_calls > 0 else 0
    internal_avg_duration = sum(r.get('duration', 0) for r in records if r.get('direction') == DIRECTION_INTERNAL) / internal_calls if internal_calls > 0 else 0
    
    return {
        "total_calls": total_calls,
        "avg_duration": round(avg_duration, 2),
        "total_duration": total_duration,
        "avg_billsec": round(avg_billsec, 2),
        "total_billsec": total_billsec,
        "answered_calls": answered_calls,
        "no_answer_calls": no_answer_calls,
        "busy_calls": busy_calls,
        "failed_calls": failed_calls,
        "answer_percentage": round((answered_calls / total_calls * 100), 2) if total_calls > 0 else 0,
        "unique_numbers": len(unique_sources),
        "inbound_calls": inbound_calls,
        "outbound_calls": outbound_calls,
        "internal_calls": internal_calls,
        "unknown_direction_calls": unknown_direction_calls,
        "inbound_answer_rate": round(inbound_answer_rate, 2),
        "outbound_answer_rate": round(outbound_answer_rate, 2),
        "inbound_avg_duration": round(inbound_avg_duration, 2),
        "outbound_avg_duration": round(outbound_avg_duration, 2),
        "internal_avg_duration": round(internal_avg_duration, 2),
        "has_recording": has_recording,
        "recording_percentage": round(recording_percentage, 2)
    }

@router.get("", response_model=CallRecordsResponse)
async def get_call_records(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    limit: int = Query(100, description="Maximum number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
    disposition: Optional[str] = Query(None, description="Filter by call disposition (e.g., ANSWERED, NO ANSWER)"),
    direction: Optional[str] = Query(None, description="Filter by call direction (inbound, outbound, internal)"),
    src: Optional[str] = Query(None, description="Filter by source phone number"),
    dst: Optional[str] = Query(None, description="Filter by destination phone number"),
    has_recording: Optional[bool] = Query(None, description="Filter for calls with recordings"),
    min_duration: Optional[int] = Query(None, description="Minimum call duration in seconds"),
    max_duration: Optional[int] = Query(None, description="Maximum call duration in seconds"),
    sort_by: str = Query("calldate", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get call records from the company's ISSABEL database.
    
    This endpoint retrieves call records between the specified dates.
    Users can only access records for their own company.
    """
    try:
        # Parse dates
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            
            # If end_date is provided as just a date, set time to end of day
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            
            # Validate date range
            date_diff = (end_dt - start_dt).days
            if date_diff < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
                
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Validate sort parameters
        valid_sort_fields = ["calldate", "duration", "billsec", "src", "dst"]
        if sort_by not in valid_sort_fields:
            sort_by = "calldate"  # Default to calldate if invalid
        
        sort_order = sort_order.lower()
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"  # Default to descending if invalid
        
        # Get the company_id from the current user
        company_id = current_user.get("company_id")
        if not company_id or company_id == "None":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with any company"
            )
        
        # Get database connection details for the user's company
        try:
            connection_details = await get_company_db_connection(company_id, current_user, db)
        except HTTPException as e:
            # Re-raise with more specific context
            if e.status_code == status.HTTP_400_BAD_REQUEST:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Your company does not have ISSABEL database configured. Please contact an administrator."
                )
            raise
        
        # Connect to the ISSABEL database
        conn = None
        try:
            conn = pymysql.connect(
                host=connection_details["host"],
                user=connection_details["user"],
                password=connection_details["password"],
                database=connection_details["database"],
                port=connection_details["port"],
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor  # Return results as dictionaries
            )
            
            # Build the SQL query with proper date formatting and parameterization
            query = """
                SELECT * FROM cdr 
                WHERE calldate BETWEEN %s AND %s
            """
            params = [start_dt, end_dt]
            
            # Add optional filters
            if disposition:
                query += " AND disposition = %s"
                params.append(disposition)
                
            if src:
                query += " AND src LIKE %s"
                params.append(f"%{src}%")
                
            if dst:
                query += " AND dst LIKE %s"
                params.append(f"%{dst}%")
            
            if has_recording is not None:
                if has_recording:
                    query += " AND recordingfile != ''"
                else:
                    query += " AND (recordingfile = '' OR recordingfile IS NULL)"
            
            if min_duration is not None:
                query += " AND duration >= %s"
                params.append(min_duration)
            
            if max_duration is not None:
                query += " AND duration <= %s"
                params.append(max_duration)
            
            # Add count query to get total records
            count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
            
            # Add sorting and pagination to the main query
            query += f" ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            with conn.cursor() as cursor:
                # Get total count
                cursor.execute(count_query, params[:-2])  # Exclude limit and offset params
                count_result = cursor.fetchone()
                total_count = count_result["total"] if count_result else 0
                
                # Get the actual records
                cursor.execute(query, params)
                records = cursor.fetchall()
                
                # Add direction to each record
                for record in records:
                    record['direction'] = determine_call_direction(record.get('src', ''), record.get('dst', ''))
                
                # Filter by direction if specified
                if direction:
                    records = [r for r in records if r.get('direction') == direction]
                
                # Calculate metrics
                metrics = calculate_metrics(records)
                
                # Get summary for all matching records (not just the page)
                summary_query = """
                    SELECT 
                        COUNT(*) AS total_calls,
                        SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
                        SUM(CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END) AS no_answer_calls,
                        SUM(CASE WHEN disposition = 'BUSY' THEN 1 ELSE 0 END) AS busy_calls,
                        SUM(CASE WHEN disposition = 'FAILED' THEN 1 ELSE 0 END) AS failed_calls,
                        AVG(duration) AS avg_duration,
                        AVG(billsec) AS avg_billsec,
                        SUM(CASE WHEN recordingfile != '' THEN 1 ELSE 0 END) AS has_recording
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                cursor.execute(summary_query, [start_dt, end_dt])
                summary = cursor.fetchone()
                
                if summary:
                    # Process numeric values
                    for key in ['avg_duration', 'avg_billsec']:
                        if summary[key] is not None:
                            summary[key] = round(float(summary[key]), 1)
                    
                    # Calculate answer rate
                    if summary["total_calls"] > 0:
                        summary["answer_rate"] = round(summary["answered_calls"] / summary["total_calls"] * 100, 1)
                        summary["recording_percentage"] = round(summary["has_recording"] / summary["total_calls"] * 100, 1)
                    else:
                        summary["answer_rate"] = 0
                        summary["recording_percentage"] = 0
                    
                    # Get direction counts for summary
                    direction_query = """
                        SELECT 
                            src, dst
                        FROM cdr
                        WHERE calldate BETWEEN %s AND %s
                    """
                    cursor.execute(direction_query, [start_dt, end_dt])
                    direction_records = cursor.fetchall()
                    
                    inbound_count = 0
                    outbound_count = 0
                    internal_count = 0
                    
                    for record in direction_records:
                        call_direction = determine_call_direction(record.get('src', ''), record.get('dst', ''))
                        if call_direction == DIRECTION_INBOUND:
                            inbound_count += 1
                        elif call_direction == DIRECTION_OUTBOUND:
                            outbound_count += 1
                        elif call_direction == DIRECTION_INTERNAL:
                            internal_count += 1
                    
                    summary["total_inbound"] = inbound_count
                    summary["total_outbound"] = outbound_count
                    summary["total_internal"] = internal_count
                
                # Prepare time period info
                time_period = {
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_days": date_diff + 1
                }
                
                # Prepare response
                return {
                    "time_period": time_period,
                    "summary": summary,
                    "records": records,
                    "total_count": total_count,
                    "filtered_count": len(records)
                }
                
        except pymysql.MySQLError as e:
            logger.error(f"MySQL Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error getting call records: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve call records: {str(e)}"
            )

@router.get("/metrics", response_model=Dict[str, Any])
async def get_call_metrics(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    disposition: Optional[str] = Query(None, description="Filter by call disposition (e.g., ANSWERED, NO ANSWER)"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get aggregated call metrics from the company's ISSABEL database.
    
    This endpoint provides analytics based on call records between the specified dates.
    Users can only access metrics for their own company.
    """
    try:
        # Parse dates (same as in get_call_records)
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            
            # Validate date range
            date_diff = (end_dt - start_dt).days
            if date_diff < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
                
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Get the company_id from the current user
        company_id = current_user.get("company_id")
        if not company_id or company_id == "None":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with any company"
            )
        
        # Get database connection details
        connection_details = await get_company_db_connection(company_id, current_user, db)
        
        # Connect to the ISSABEL database
        conn = None
        try:
            conn = pymysql.connect(
                host=connection_details["host"],
                user=connection_details["user"],
                password=connection_details["password"],
                database=connection_details["database"],
                port=connection_details["port"],
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with conn.cursor() as cursor:
                # Basic metrics query
                basic_query = """
                    SELECT 
                        COUNT(*) AS total_calls,
                        SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
                        AVG(duration) AS avg_duration,
                        SUM(duration) AS total_duration,
                        AVG(billsec) AS avg_billsec,
                        SUM(billsec) AS total_billsec
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                
                params = [start_dt, end_dt]
                
                if disposition:
                    basic_query += " AND disposition = %s"
                    params.append(disposition)
                
                cursor.execute(basic_query, params)
                basic_metrics = cursor.fetchone()
                
                # Daily distribution query
                daily_query = """
                    SELECT 
                        DATE(calldate) AS call_date,
                        COUNT(*) AS num_calls,
                        SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
                        AVG(duration) AS avg_duration,
                        SUM(duration) AS total_duration
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                
                params = [start_dt, end_dt]
                
                if disposition:
                    daily_query += " AND disposition = %s"
                    params.append(disposition)
                    
                daily_query += " GROUP BY DATE(calldate) ORDER BY call_date"
                
                cursor.execute(daily_query, params)
                daily_distribution = cursor.fetchall()
                
                # Hourly distribution (time of day)
                hourly_query = """
                    SELECT 
                        HOUR(calldate) AS hour_of_day,
                        COUNT(*) AS num_calls
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                
                params = [start_dt, end_dt]
                
                if disposition:
                    hourly_query += " AND disposition = %s"
                    params.append(disposition)
                    
                hourly_query += " GROUP BY HOUR(calldate) ORDER BY hour_of_day"
                
                cursor.execute(hourly_query, params)
                hourly_distribution = cursor.fetchall()
                
                # Top callers
                top_callers_query = """
                    SELECT 
                        src,
                        COUNT(*) AS call_count,
                        SUM(duration) AS total_duration
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                
                params = [start_dt, end_dt]
                
                if disposition:
                    top_callers_query += " AND disposition = %s"
                    params.append(disposition)
                    
                top_callers_query += " GROUP BY src ORDER BY call_count DESC LIMIT 10"
                
                cursor.execute(top_callers_query, params)
                top_callers = cursor.fetchall()
                
                # Disposition distribution
                disposition_query = """
                    SELECT 
                        disposition,
                        COUNT(*) AS count,
                        AVG(duration) AS avg_duration
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                    GROUP BY disposition
                    ORDER BY count DESC
                """
                
                cursor.execute(disposition_query, [start_dt, end_dt])
                disposition_distribution = cursor.fetchall()
                
                # Format the metrics for better readability
                if basic_metrics:
                    for key in ['avg_duration', 'avg_billsec']:
                        if basic_metrics[key] is not None:
                            basic_metrics[key] = round(float(basic_metrics[key]), 2)
                
                # Format the daily distribution dates to strings
                for day in daily_distribution:
                    if 'call_date' in day and day['call_date'] is not None:
                        day['call_date'] = day['call_date'].strftime('%Y-%m-%d')
                    if 'avg_duration' in day and day['avg_duration'] is not None:
                        day['avg_duration'] = round(float(day['avg_duration']), 2)
                
                return {
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "days": (end_dt - start_dt).days + 1
                    },
                    "basic_metrics": basic_metrics,
                    "daily_distribution": daily_distribution,
                    "hourly_distribution": hourly_distribution,
                    "top_callers": top_callers,
                    "disposition_distribution": disposition_distribution
                }
                
        except pymysql.MySQLError as e:
            logger.error(f"MySQL Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error getting call metrics: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve call metrics: {str(e)}"
            )

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_call_dashboard(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
    use_cache: bool = Query(True, description="Whether to use cached data if available")
):
    """
    Get comprehensive dashboard data for call center visualizations.
    
    This endpoint provides multiple metrics suitable for dashboard visualizations,
    including direction-based metrics (inbound, outbound, internal).
    """
    try:
        # Parse dates
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            
            # Validate date range
            date_diff = (end_dt - start_dt).days
            if date_diff < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Get the company_id from the current user
        company_id = current_user.get("company_id")
        if not company_id or company_id == "None":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with any company"
            )
        
        # Check cache first if caching is enabled
        if use_cache:
            cache_params = {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
            cache_key = generate_cache_key("dashboard", cache_params)
            cached_data = get_cached_data(cache_key)
            if cached_data:
                logger.info(f"Returning cached dashboard data for company {company_id}")
                return cached_data
        
        # Get database connection details
        connection_details = await get_company_db_connection(company_id, current_user, db)
        
        # Connect to the ISSABEL database
        conn = None
        try:
            conn = pymysql.connect(
                host=connection_details["host"],
                user=connection_details["user"],
                password=connection_details["password"],
                database=connection_details["database"],
                port=connection_details["port"],
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with conn.cursor() as cursor:
                # Get all calls in the date range for direction analysis
                all_calls_query = """
                    SELECT 
                        calldate, src, dst, duration, billsec, disposition, recordingfile
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                cursor.execute(all_calls_query, [start_dt, end_dt])
                all_calls = cursor.fetchall()
                
                # Process calls to add direction
                for call in all_calls:
                    call['direction'] = determine_call_direction(call.get('src', ''), call.get('dst', ''))
                
                # Count by direction
                inbound_count = sum(1 for c in all_calls if c['direction'] == DIRECTION_INBOUND)
                outbound_count = sum(1 for c in all_calls if c['direction'] == DIRECTION_OUTBOUND)
                internal_count = sum(1 for c in all_calls if c['direction'] == DIRECTION_INTERNAL)
                unknown_count = sum(1 for c in all_calls if c['direction'] == DIRECTION_UNKNOWN)
                
                # Summary metrics
                summary_query = """
                    SELECT 
                        COUNT(*) AS total_calls,
                        SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
                        SUM(CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END) AS no_answer_calls,
                        SUM(CASE WHEN disposition = 'BUSY' THEN 1 ELSE 0 END) AS busy_calls,
                        SUM(CASE WHEN disposition = 'FAILED' THEN 1 ELSE 0 END) AS failed_calls,
                        AVG(duration) AS avg_duration,
                        SUM(duration) AS total_duration,
                        AVG(billsec) AS avg_billsec,
                        SUM(billsec) AS total_billsec,
                        SUM(CASE WHEN recordingfile != '' THEN 1 ELSE 0 END) AS with_recording
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                cursor.execute(summary_query, [start_dt, end_dt])
                summary = cursor.fetchone()
                
                # Calculate percentages
                total_calls = summary["total_calls"] if summary else 0
                if total_calls > 0:
                    summary["answer_rate"] = round(summary["answered_calls"] / total_calls * 100, 1)
                    summary["recording_percentage"] = round(summary["with_recording"] / total_calls * 100, 1)
                    
                    # Add direction counts and percentages
                    summary["total_inbound"] = inbound_count
                    summary["total_outbound"] = outbound_count
                    summary["total_internal"] = internal_count
                    summary["inbound_percentage"] = round(inbound_count / total_calls * 100, 1)
                    summary["outbound_percentage"] = round(outbound_count / total_calls * 100, 1)
                    summary["internal_percentage"] = round(internal_count / total_calls * 100, 1)
                else:
                    summary = {
                        "total_calls": 0,
                        "answered_calls": 0,
                        "no_answer_calls": 0,
                        "busy_calls": 0,
                        "failed_calls": 0,
                        "avg_duration": 0,
                        "total_duration": 0,
                        "avg_billsec": 0,
                        "total_billsec": 0,
                        "with_recording": 0,
                        "answer_rate": 0,
                        "recording_percentage": 0,
                        "total_inbound": 0,
                        "total_outbound": 0, 
                        "total_internal": 0,
                        "inbound_percentage": 0,
                        "outbound_percentage": 0,
                        "internal_percentage": 0
                    }
                
                # Round numeric values
                for key in ['avg_duration', 'avg_billsec']:
                    if summary[key] is not None:
                        summary[key] = round(float(summary[key]), 1)
                
                # Daily data with direction breakdown
                daily_data = {}
                
                for call in all_calls:
                    date_str = call['calldate'].strftime('%Y-%m-%d')
                    direction = call['direction']
                    disposition = call['disposition']
                    
                    if date_str not in daily_data:
                        daily_data[date_str] = {
                            "date": date_str,
                            "total": 0,
                            "answered": 0,
                            "inbound": 0,
                            "outbound": 0,
                            "internal": 0,
                            "duration": 0,
                            "billsec": 0
                        }
                    
                    daily_data[date_str]["total"] += 1
                    
                    if disposition == DISPOSITION_ANSWERED:
                        daily_data[date_str]["answered"] += 1
                    
                    if direction == DIRECTION_INBOUND:
                        daily_data[date_str]["inbound"] += 1
                    elif direction == DIRECTION_OUTBOUND:
                        daily_data[date_str]["outbound"] += 1
                    elif direction == DIRECTION_INTERNAL:
                        daily_data[date_str]["internal"] += 1
                    
                    daily_data[date_str]["duration"] += call.get('duration', 0)
                    daily_data[date_str]["billsec"] += call.get('billsec', 0)
                
                # Calculate averages
                for date_str in daily_data:
                    if daily_data[date_str]["total"] > 0:
                        daily_data[date_str]["avg_duration"] = round(daily_data[date_str]["duration"] / daily_data[date_str]["total"], 1)
                        daily_data[date_str]["avg_billsec"] = round(daily_data[date_str]["billsec"] / daily_data[date_str]["total"], 1)
                    else:
                        daily_data[date_str]["avg_duration"] = 0
                        daily_data[date_str]["avg_billsec"] = 0
                
                # Convert to sorted list
                daily_data_list = sorted(daily_data.values(), key=lambda x: x["date"])
                
                # Hourly distribution with direction breakdown
                hourly_data = {}
                
                for call in all_calls:
                    hour = call['calldate'].hour
                    direction = call['direction']
                    
                    if hour not in hourly_data:
                        hourly_data[hour] = {
                            "hour": hour,
                            "total": 0,
                            "inbound": 0,
                            "outbound": 0,
                            "internal": 0,
                            "answered": 0
                        }
                    
                    hourly_data[hour]["total"] += 1
                    
                    if direction == DIRECTION_INBOUND:
                        hourly_data[hour]["inbound"] += 1
                    elif direction == DIRECTION_OUTBOUND:
                        hourly_data[hour]["outbound"] += 1
                    elif direction == DIRECTION_INTERNAL:
                        hourly_data[hour]["internal"] += 1
                    
                    if call['disposition'] == DISPOSITION_ANSWERED:
                        hourly_data[hour]["answered"] += 1
                
                # Convert to sorted list
                hourly_data_list = [hourly_data[hour] for hour in sorted(hourly_data.keys())]
                
                # Get disposition breakdown
                disposition_query = """
                    SELECT 
                        disposition,
                        COUNT(*) AS count,
                        AVG(duration) AS avg_duration
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                    GROUP BY disposition
                    ORDER BY count DESC
                """
                cursor.execute(disposition_query, [start_dt, end_dt])
                disposition_data = cursor.fetchall()
                
                # Format disposition data
                for item in disposition_data:
                    if 'avg_duration' in item and item['avg_duration'] is not None:
                        item['avg_duration'] = round(float(item['avg_duration']), 1)
                
                # Get top 10 source numbers with direction
                top_sources = []
                source_counts = {}
                
                for call in all_calls:
                    source = call.get('src', '')
                    if source:
                        if source not in source_counts:
                            source_counts[source] = {
                                "src": source,
                                "calls": 0,
                                "inbound": 0,
                                "outbound": 0,
                                "internal": 0,
                                "duration": 0
                            }
                        
                        direction = call['direction']
                        source_counts[source]["calls"] += 1
                        
                        if direction == DIRECTION_INBOUND:
                            source_counts[source]["inbound"] += 1
                        elif direction == DIRECTION_OUTBOUND:
                            source_counts[source]["outbound"] += 1
                        elif direction == DIRECTION_INTERNAL:
                            source_counts[source]["internal"] += 1
                        
                        source_counts[source]["duration"] += call.get('duration', 0)
                
                # Calculate average duration and sort
                for source in source_counts:
                    if source_counts[source]["calls"] > 0:
                        source_counts[source]["avg_duration"] = round(source_counts[source]["duration"] / source_counts[source]["calls"], 1)
                    else:
                        source_counts[source]["avg_duration"] = 0
                
                # Get top 10
                top_sources = sorted(source_counts.values(), key=lambda x: x["calls"], reverse=True)[:10]
                
                # Get duration distribution
                duration_ranges = {
                    '0-15s': 0,
                    '16-30s': 0,
                    '31-60s': 0,
                    '1-3m': 0,
                    '3-5m': 0,
                    '>5m': 0
                }
                
                for call in all_calls:
                    duration = call.get('duration', 0)
                    
                    if duration <= 15:
                        duration_ranges['0-15s'] += 1
                    elif duration <= 30:
                        duration_ranges['16-30s'] += 1
                    elif duration <= 60:
                        duration_ranges['31-60s'] += 1
                    elif duration <= 180:
                        duration_ranges['1-3m'] += 1
                    elif duration <= 300:
                        duration_ranges['3-5m'] += 1
                    else:
                        duration_ranges['>5m'] += 1
                
                # Format as list
                duration_distribution = [
                    {"duration_range": range_name, "count": count}
                    for range_name, count in duration_ranges.items()
                ]
                
                # Add distribution by direction
                direction_duration = {
                    DIRECTION_INBOUND: {
                        '0-15s': 0, '16-30s': 0, '31-60s': 0, 
                        '1-3m': 0, '3-5m': 0, '>5m': 0
                    },
                    DIRECTION_OUTBOUND: {
                        '0-15s': 0, '16-30s': 0, '31-60s': 0, 
                        '1-3m': 0, '3-5m': 0, '>5m': 0
                    },
                    DIRECTION_INTERNAL: {
                        '0-15s': 0, '16-30s': 0, '31-60s': 0, 
                        '1-3m': 0, '3-5m': 0, '>5m': 0
                    }
                }
                
                for call in all_calls:
                    direction = call['direction']
                    if direction in [DIRECTION_INBOUND, DIRECTION_OUTBOUND, DIRECTION_INTERNAL]:
                        duration = call.get('duration', 0)
                        
                        if duration <= 15:
                            direction_duration[direction]['0-15s'] += 1
                        elif duration <= 30:
                            direction_duration[direction]['16-30s'] += 1
                        elif duration <= 60:
                            direction_duration[direction]['31-60s'] += 1
                        elif duration <= 180:
                            direction_duration[direction]['1-3m'] += 1
                        elif duration <= 300:
                            direction_duration[direction]['3-5m'] += 1
                        else:
                            direction_duration[direction]['>5m'] += 1
                
                # Get recording statistics
                recordings_query = """
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN recordingfile != '' THEN 1 ELSE 0 END) AS with_recording
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                cursor.execute(recordings_query, [start_dt, end_dt])
                recordings_data = cursor.fetchone()
                
                # Calculate recording percentage
                if recordings_data and recordings_data["total"] > 0:
                    recordings_data["recording_percentage"] = round(recordings_data["with_recording"] / recordings_data["total"] * 100, 1)
                else:
                    recordings_data = {"total": 0, "with_recording": 0, "recording_percentage": 0}
                
                # Add direction-specific recording stats
                recording_by_direction = {
                    DIRECTION_INBOUND: 0,
                    DIRECTION_OUTBOUND: 0,
                    DIRECTION_INTERNAL: 0
                }
                
                for call in all_calls:
                    if call.get('recordingfile', ''):
                        direction = call['direction']
                        if direction in recording_by_direction:
                            recording_by_direction[direction] += 1
                
                recordings_data["by_direction"] = recording_by_direction
                
                # Prepare the final response
                response = {
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "total_days": date_diff + 1
                    },
                    "summary": summary,
                    "direction_breakdown": {
                        "inbound": inbound_count,
                        "outbound": outbound_count,
                        "internal": internal_count,
                        "unknown": unknown_count
                    },
                    "daily_data": daily_data_list,
                    "hourly_distribution": hourly_data_list,
                    "disposition_data": disposition_data,
                    "top_sources": top_sources,
                    "duration_distribution": duration_distribution,
                    "duration_by_direction": direction_duration,
                    "recordings_data": recordings_data,
                    "cache_info": {
                        "source": "database",
                        "generated_at": datetime.now().isoformat()
                    }
                }
                
                # Cache the response for future requests if there's data
                if total_calls > 0:
                    cache_key = generate_cache_key("dashboard", cache_params)
                    set_cached_data(cache_key, response, expiry_type="medium")
                
                return response
                
        except pymysql.MySQLError as e:
            logger.error(f"MySQL Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Database error: {str(e)}"
            )
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve dashboard data: {str(e)}"
            )

@router.get("/caller-insights", response_model=Dict[str, Any])
async def get_caller_insights(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    min_calls: int = Query(1, description="Minimum number of calls to be considered a frequent caller"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get insights about callers and their behavior patterns.
    
    This endpoint analyzes call patterns by source number.
    """
    try:
        # Parse dates
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            
            # Validate date range
            date_diff = (end_dt - start_dt).days
            if date_diff < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Get the company_id from the current user
        company_id = current_user.get("company_id")
        if not company_id or company_id == "None":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with any company"
            )
        
        # Get database connection details
        connection_details = await get_company_db_connection(company_id, current_user, db)
        
        # Connect to the ISSABEL database
        conn = None
        try:
            conn = pymysql.connect(
                host=connection_details["host"],
                user=connection_details["user"],
                password=connection_details["password"],
                database=connection_details["database"],
                port=connection_details["port"],
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with conn.cursor() as cursor:
                # Top callers with detailed metrics
                top_callers_query = """
                    SELECT 
                        src,
                        COUNT(*) AS call_count,
                        SUM(duration) AS total_duration,
                        AVG(duration) AS avg_duration,
                        SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered_calls,
                        MIN(calldate) AS first_call,
                        MAX(calldate) AS last_call
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                      AND src != ''
                    GROUP BY src
                    HAVING COUNT(*) >= %s
                    ORDER BY call_count DESC
                    LIMIT 20
                """
                cursor.execute(top_callers_query, [start_dt, end_dt, min_calls])
                top_callers = cursor.fetchall()
                
                # Format caller data
                for caller in top_callers:
                    if 'avg_duration' in caller and caller['avg_duration'] is not None:
                        caller['avg_duration'] = round(float(caller['avg_duration']), 1)
                    
                    if 'first_call' in caller and caller['first_call'] is not None:
                        caller['first_call'] = caller['first_call'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    if 'last_call' in caller and caller['last_call'] is not None:
                        caller['last_call'] = caller['last_call'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Calculate answer rate
                    if caller['call_count'] > 0:
                        caller['answer_rate'] = round(caller['answered_calls'] / caller['call_count'] * 100, 1)
                
                # Caller frequency distribution
                frequency_query = """
                    SELECT
                        CASE
                            WHEN calls = 1 THEN 'one_time'
                            WHEN calls BETWEEN 2 AND 5 THEN '2_5_calls'
                            WHEN calls BETWEEN 6 AND 10 THEN '6_10_calls'
                            ELSE 'more_than_10'
                        END AS frequency,
                        COUNT(*) AS count
                    FROM (
                        SELECT 
                            src,
                            COUNT(*) AS calls
                        FROM cdr
                        WHERE calldate BETWEEN %s AND %s
                          AND src != ''
                        GROUP BY src
                    ) AS caller_counts
                    GROUP BY frequency
                    ORDER BY
                        CASE frequency
                            WHEN 'one_time' THEN 1
                            WHEN '2_5_calls' THEN 2
                            WHEN '6_10_calls' THEN 3
                            ELSE 4
                        END
                """
                cursor.execute(frequency_query, [start_dt, end_dt])
                caller_frequency = cursor.fetchall()
                
                # Time of day distribution for calls
                time_of_day_query = """
                    SELECT
                        src,
                        SUM(CASE WHEN HOUR(calldate) BETWEEN 5 AND 11 THEN 1 ELSE 0 END) AS morning_calls,
                        SUM(CASE WHEN HOUR(calldate) BETWEEN 12 AND 17 THEN 1 ELSE 0 END) AS afternoon_calls,
                        SUM(CASE WHEN HOUR(calldate) BETWEEN 18 AND 23 OR HOUR(calldate) BETWEEN 0 AND 4 THEN 1 ELSE 0 END) AS evening_calls,
                        COUNT(*) AS total_calls
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                      AND src != ''
                    GROUP BY src
                    HAVING COUNT(*) >= %s
                    ORDER BY total_calls DESC
                    LIMIT 50
                """
                cursor.execute(time_of_day_query, [start_dt, end_dt, min_calls])
                time_of_day_data = cursor.fetchall()
                
                # Identify caller patterns
                caller_patterns = {
                    "morning_callers": [],
                    "afternoon_callers": [],
                    "evening_callers": [],
                    "no_answer_callers": []
                }
                
                for caller in time_of_day_data:
                    # Determine primary calling time
                    max_time = max(caller['morning_calls'], caller['afternoon_calls'], caller['evening_calls'])
                    total = caller['total_calls']
                    
                    if max_time == caller['morning_calls'] and caller['morning_calls'] > total * 0.5:
                        caller_patterns["morning_callers"].append(caller['src'])
                    elif max_time == caller['afternoon_calls'] and caller['afternoon_calls'] > total * 0.5:
                        caller_patterns["afternoon_callers"].append(caller['src'])
                    elif max_time == caller['evening_calls'] and caller['evening_calls'] > total * 0.5:
                        caller_patterns["evening_callers"].append(caller['src'])
                
                # Identify callers with high rate of no answers
                no_answer_query = """
                    SELECT
                        src,
                        COUNT(*) AS total_calls,
                        SUM(CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END) AS no_answer_calls
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                      AND src != ''
                    GROUP BY src
                    HAVING COUNT(*) >= %s AND SUM(CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END) / COUNT(*) > 0.5
                    ORDER BY SUM(CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END) / COUNT(*) DESC
                    LIMIT 20
                """
                cursor.execute(no_answer_query, [start_dt, end_dt, min_calls])
                no_answer_callers = cursor.fetchall()
                
                for caller in no_answer_callers:
                    caller_patterns["no_answer_callers"].append(caller['src'])
                
                # Get unique count of sources/callers
                unique_callers_query = """
                    SELECT COUNT(DISTINCT src) AS unique_callers
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                      AND src != ''
                """
                cursor.execute(unique_callers_query, [start_dt, end_dt])
                unique_callers_result = cursor.fetchone()
                unique_callers = unique_callers_result['unique_callers'] if unique_callers_result else 0
                
                return {
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "total_days": date_diff + 1
                    },
                    "summary": {
                        "unique_callers": unique_callers,
                        "repeat_callers": unique_callers - (next((item for item in caller_frequency if item['frequency'] == 'one_time'), {'count': 0}))['count']
                    },
                    "top_callers": top_callers,
                    "caller_frequency": caller_frequency,
                    "time_of_day_data": time_of_day_data,
                    "caller_patterns": caller_patterns
                }
                
        except pymysql.MySQLError as e:
            logger.error(f"MySQL Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Database error: {str(e)}"
            )
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error getting caller insights: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve caller insights: {str(e)}"
            )

@router.get("/direction-analysis", response_model=Dict[str, Any])
async def get_direction_analysis(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
    use_cache: bool = Query(True, description="Whether to use cached data if available")
):
    """
    Get detailed analysis of call directions (inbound, outbound, internal).
    
    This endpoint provides metrics and patterns related to call directions.
    """
    try:
        # Parse dates
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            
            # Validate date range
            date_diff = (end_dt - start_dt).days
            if date_diff < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="End date must be after start date"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Get the company_id from the current user
        company_id = current_user.get("company_id")
        if not company_id or company_id == "None":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not associated with any company"
            )
        
        # Check cache first if caching is enabled
        if use_cache:
            cache_params = {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
            cache_key = generate_cache_key("direction_analysis", cache_params)
            cached_data = get_cached_data(cache_key)
            if cached_data:
                logger.info(f"Returning cached direction analysis data for company {company_id}")
                return cached_data
        
        # Get database connection details
        connection_details = await get_company_db_connection(company_id, current_user, db)
        
        # Connect to the ISSABEL database
        conn = None
        try:
            conn = pymysql.connect(
                host=connection_details["host"],
                user=connection_details["user"],
                password=connection_details["password"],
                database=connection_details["database"],
                port=connection_details["port"],
                connect_timeout=10,
                cursorclass=pymysql.cursors.DictCursor
            )
            
            with conn.cursor() as cursor:
                # Get all calls in the date range
                call_query = """
                    SELECT 
                        calldate, src, dst, duration, billsec, disposition, recordingfile
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                """
                cursor.execute(call_query, [start_dt, end_dt])
                calls = cursor.fetchall()
                
                # Process calls to add direction
                inbound_calls = []
                outbound_calls = []
                internal_calls = []
                unknown_calls = []
                
                for call in calls:
                    direction = determine_call_direction(call.get('src', ''), call.get('dst', ''))
                    call['direction'] = direction
                    
                    if direction == DIRECTION_INBOUND:
                        inbound_calls.append(call)
                    elif direction == DIRECTION_OUTBOUND:
                        outbound_calls.append(call)
                    elif direction == DIRECTION_INTERNAL:
                        internal_calls.append(call)
                    else:
                        unknown_calls.append(call)
                
                # Calculate basic metrics
                total_calls = len(calls)
                inbound_count = len(inbound_calls)
                outbound_count = len(outbound_calls)
                internal_count = len(internal_calls)
                unknown_count = len(unknown_calls)
                
                # Calculate percentages
                inbound_pct = round((inbound_count / total_calls * 100), 1) if total_calls > 0 else 0
                outbound_pct = round((outbound_count / total_calls * 100), 1) if total_calls > 0 else 0
                internal_pct = round((internal_count / total_calls * 100), 1) if total_calls > 0 else 0
                unknown_pct = round((unknown_count / total_calls * 100), 1) if total_calls > 0 else 0
                
                # Calculate disposition metrics by direction
                direction_metrics = {}
                
                for direction_name, direction_calls in [
                    (DIRECTION_INBOUND, inbound_calls),
                    (DIRECTION_OUTBOUND, outbound_calls),
                    (DIRECTION_INTERNAL, internal_calls)
                ]:
                    if not direction_calls:
                        direction_metrics[direction_name] = {
                            "total": 0,
                            "answered": 0,
                            "no_answer": 0,
                            "busy": 0,
                            "failed": 0,
                            "avg_duration": 0,
                            "avg_billsec": 0,
                            "answer_rate": 0,
                            "recording_count": 0,
                            "recording_rate": 0
                        }
                        continue
                    
                    answered = sum(1 for c in direction_calls if c.get('disposition') == DISPOSITION_ANSWERED)
                    no_answer = sum(1 for c in direction_calls if c.get('disposition') == DISPOSITION_NO_ANSWER)
                    busy = sum(1 for c in direction_calls if c.get('disposition') == DISPOSITION_BUSY)
                    failed = sum(1 for c in direction_calls if c.get('disposition') == DISPOSITION_FAILED)
                    
                    avg_duration = sum(c.get('duration', 0) for c in direction_calls) / len(direction_calls)
                    avg_billsec = sum(c.get('billsec', 0) for c in direction_calls) / len(direction_calls)
                    
                    recordings = sum(1 for c in direction_calls if c.get('recordingfile', ''))
                    
                    direction_metrics[direction_name] = {
                        "total": len(direction_calls),
                        "answered": answered,
                        "no_answer": no_answer,
                        "busy": busy,
                        "failed": failed,
                        "avg_duration": round(avg_duration, 1),
                        "avg_billsec": round(avg_billsec, 1),
                        "answer_rate": round((answered / len(direction_calls) * 100), 1),
                        "recording_count": recordings,
                        "recording_rate": round((recordings / len(direction_calls) * 100), 1) if len(direction_calls) > 0 else 0
                    }
                
                # Daily distribution by direction
                daily_query = """
                    SELECT 
                        DATE(calldate) AS call_date,
                        COUNT(*) AS total_calls,
                        src, dst
                    FROM cdr
                    WHERE calldate BETWEEN %s AND %s
                    GROUP BY DATE(calldate), src, dst
                    ORDER BY call_date
                """
                cursor.execute(daily_query, [start_dt, end_dt])
                daily_results = cursor.fetchall()
                
                # Build daily direction distribution
                daily_direction = {}
                
                for result in daily_results:
                    date_str = result['call_date'].strftime('%Y-%m-%d')
                    direction = determine_call_direction(result.get('src', ''), result.get('dst', ''))
                    
                    if date_str not in daily_direction:
                        daily_direction[date_str] = {
                            "date": date_str,
                            "total": 0,
                            DIRECTION_INBOUND: 0,
                            DIRECTION_OUTBOUND: 0,
                            DIRECTION_INTERNAL: 0,
                            DIRECTION_UNKNOWN: 0
                        }
                    
                    daily_direction[date_str]["total"] += result['total_calls']
                    daily_direction[date_str][direction] += result['total_calls']
                
                # Hourly distribution by direction
                hourly_direction = {}
                
                for call in calls:
                    hour = call['calldate'].hour
                    direction = call['direction']
                    
                    if hour not in hourly_direction:
                        hourly_direction[hour] = {
                            "hour": hour,
                            "total": 0,
                            DIRECTION_INBOUND: 0,
                            DIRECTION_OUTBOUND: 0,
                            DIRECTION_INTERNAL: 0,
                            DIRECTION_UNKNOWN: 0
                        }
                    
                    hourly_direction[hour]["total"] += 1
                    hourly_direction[hour][direction] += 1
                
                # Top inbound sources
                inbound_sources = {}
                for call in inbound_calls:
                    source = call.get('src', '')
                    if source:
                        if source not in inbound_sources:
                            inbound_sources[source] = 0
                        inbound_sources[source] += 1
                
                # Top outbound destinations
                outbound_destinations = {}
                for call in outbound_calls:
                    dest = call.get('dst', '')
                    if dest:
                        if dest not in outbound_destinations:
                            outbound_destinations[dest] = 0
                        outbound_destinations[dest] += 1
                
                # Convert to sorted lists
                top_inbound_sources = [
                    {"source": source, "calls": count}
                    for source, count in sorted(inbound_sources.items(), key=lambda x: x[1], reverse=True)[:10]
                ]
                
                top_outbound_destinations = [
                    {"destination": dest, "calls": count}
                    for dest, count in sorted(outbound_destinations.items(), key=lambda x: x[1], reverse=True)[:10]
                ]
                
                # Format daily_direction as a list
                daily_direction_list = list(daily_direction.values())
                # Format hourly_direction as a list
                hourly_direction_list = [hourly_direction[hour] for hour in sorted(hourly_direction.keys())]
                
                # Prepare the final response
                response = {
                    "time_period": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "total_days": date_diff + 1
                    },
                    "summary": {
                        "total_calls": total_calls,
                        "direction_distribution": {
                            DIRECTION_INBOUND: {
                                "count": inbound_count,
                                "percentage": inbound_pct
                            },
                            DIRECTION_OUTBOUND: {
                                "count": outbound_count,
                                "percentage": outbound_pct
                            },
                            DIRECTION_INTERNAL: {
                                "count": internal_count,
                                "percentage": internal_pct
                            },
                            DIRECTION_UNKNOWN: {
                                "count": unknown_count,
                                "percentage": unknown_pct
                            }
                        }
                    },
                    "metrics_by_direction": direction_metrics,
                    "daily_direction": daily_direction_list,
                    "hourly_direction": hourly_direction_list,
                    "top_inbound_sources": top_inbound_sources,
                    "top_outbound_destinations": top_outbound_destinations,
                    "cache_info": {
                        "source": "database",
                        "generated_at": datetime.now().isoformat()
                    }
                }
                
                # Cache the response for future requests if there's data
                if total_calls > 0:
                    cache_key = generate_cache_key("direction_analysis", cache_params)
                    set_cached_data(cache_key, response, expiry_type="medium")
                
                return response
                
        except pymysql.MySQLError as e:
            logger.error(f"MySQL Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Database error: {str(e)}"
            )
        finally:
            if conn:
                conn.close()
                
    except Exception as e:
        logger.error(f"Error analyzing call directions: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to analyze call directions: {str(e)}"
            )

@router.get("/cache/stats", response_model=Dict[str, Any])
async def get_cache_statistics(current_user: dict = Depends(get_current_user)):
    """
    Get statistics about the Redis cache for call records.
    
    Administrators can use this endpoint to monitor cache performance and usage.
    """
    # Check if user is admin
    is_admin = current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access cache statistics"
        )
    
    try:
        # Get cache statistics
        stats = get_cache_stats()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cache_stats": stats,
            "cache_prefixes": ["dashboard", "direction_analysis", "caller_insights", "metrics"],
            "expiry_times": {
                "short": "5 minutes",
                "medium": "30 minutes",
                "long": "24 hours"
            }
        }
    except Exception as e:
        logger.error(f"Error retrieving cache statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cache statistics: {str(e)}"
        )

@router.delete("/cache/{prefix}", response_model=Dict[str, Any])
async def clear_cache(
    prefix: str = Path(..., description="Cache prefix to clear (e.g., 'dashboard', 'all')"),
    current_user: dict = Depends(get_current_user)
):
    """
    Clear the Redis cache for a specific prefix or all call record data.
    
    This is useful when data has been updated in the database and the cache needs to be refreshed.
    Only administrators can clear the cache.
    """
    # Check if user is admin
    is_admin = current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can clear the cache"
        )
    
    try:
        if prefix.lower() == "all":
            # Clear all call records related caches
            prefixes = ["dashboard", "direction_analysis", "caller_insights", "metrics"]
            total_cleared = 0
            
            for p in prefixes:
                cleared = invalidate_cache(p)
                total_cleared += cleared
                
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "message": f"Cleared {total_cleared} cache entries across all prefixes",
                "prefixes_cleared": prefixes,
                "entries_cleared": total_cleared
            }
        else:
            # Clear a specific prefix
            cleared = invalidate_cache(prefix)
            
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "message": f"Cleared {cleared} cache entries with prefix '{prefix}'",
                "prefix_cleared": prefix,
                "entries_cleared": cleared
            }
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )
