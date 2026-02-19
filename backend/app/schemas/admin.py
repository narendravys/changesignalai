"""
Pydantic schemas for admin operations
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from app.models.user import SubscriptionStatus


class UserListResponse(BaseModel):
    """Schema for user list in admin dashboard"""
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    is_superuser: bool
    subscription_status: SubscriptionStatus
    trial_ends_at: Optional[datetime]
    subscription_ends_at: Optional[datetime]
    organization_id: int
    organization_name: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]
    
    model_config = {"from_attributes": True}


class UserSubscriptionUpdate(BaseModel):
    """Schema for admin updating user subscription"""
    subscription_status: Optional[SubscriptionStatus] = None
    trial_ends_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    extend_days: Optional[int] = Field(None, description="Extend (positive) or reduce (negative) trial/subscription by N days")


class SubscriptionConfigUpdate(BaseModel):
    """Schema for updating subscription configuration"""
    trial_period_days: Optional[int] = Field(None, ge=0, le=90)
    monthly_price: Optional[int] = Field(None, ge=0)
    max_competitors: Optional[int] = Field(None, ge=1)
    max_monitored_pages: Optional[int] = Field(None, ge=1)


class SystemStatsResponse(BaseModel):
    """Schema for system statistics"""
    total_users: int
    active_users: int
    trial_users: int
    paid_users: int
    expired_users: int
    total_organizations: int
    total_monitored_pages: int
    total_competitors: int
    total_change_events: int
    total_feedback_open: int
    revenue_potential_monthly: int


class UserActivityResponse(BaseModel):
    """Schema for user activity logs"""
    user_id: int
    user_email: str
    action: str
    description: str
    extra_data: Optional[dict]
    timestamp: datetime
    
    model_config = {"from_attributes": True}
