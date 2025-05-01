# Company models
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List


class CompanyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    admin_email: EmailStr


class CompanyResponse(BaseModel):
    id: str
    name: str
    company_code: str
    description: Optional[str] = None
    created_at: datetime

# User models
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    company_code: Optional[str] = None  # Optional during registration

class UserLogin(BaseModel):
    username: str
    password: str
    company_code: str  # Required during login

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    company_id: str
    company_name: str
    created_at: datetime
    is_verified: bool = False
    warnings: Optional[List[str]] = None  

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    company_id: str

# Models for password reset
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class SessionCreate(BaseModel):
    """Data for creating a new user session"""
    user_id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None

class SessionResponse(BaseModel):
    """Session data returned to the client"""
    id: str
    user_id: str
    created_at: datetime
    last_active: datetime
    is_active: bool

class ConversationMessage(BaseModel):
    """Individual message in a conversation"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime

class Conversation(BaseModel):
    """Full conversation data"""
    id: str
    session_id: str
    user_id: str
    messages: List[ConversationMessage]
    created_at: datetime
    updated_at: datetime
    
class ConversationCreate(BaseModel):
    """Request to create a new conversation"""
    title: Optional[str] = "New Conversation"
    session_id: str

class ConversationUpdate(BaseModel):
    """Update conversation details"""
    title: str

class ConversationResponse(BaseModel):
    """Conversation data returned to client"""
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    last_message_preview: Optional[str] = None

class MessageResponse(BaseModel):
    """Message data returned to client"""
    id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime