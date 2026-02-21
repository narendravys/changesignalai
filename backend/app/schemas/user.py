"""
User Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import SubscriptionStatus


class OrganizationInfo(BaseModel):
    """Nested organization info for user responses"""
    id: int
    name: str
    slug: str
    
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    organization_id: int


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for reset password (with token)"""
    token: str
    new_password: str = Field(min_length=8, description="New password, min 8 characters")


class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    organization_id: int
    organization: Optional[OrganizationInfo] = None
    is_active: bool
    is_superuser: bool
    is_admin: bool
    subscription_status: SubscriptionStatus
    trial_ends_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
