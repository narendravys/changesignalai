"""
Pydantic schemas for notification preferences
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""
    email_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None
    critical_changes: Optional[bool] = None
    high_changes: Optional[bool] = None
    medium_changes: Optional[bool] = None
    low_changes: Optional[bool] = None
    daily_digest: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    custom_rules: Optional[Dict[str, Any]] = None


class NotificationPreferenceResponse(BaseModel):
    """Schema for notification preference response"""
    id: int
    user_id: int
    email_enabled: bool
    webhook_enabled: bool
    webhook_url: Optional[str]
    critical_changes: bool
    high_changes: bool
    medium_changes: bool
    low_changes: bool
    daily_digest: bool
    weekly_digest: bool
    custom_rules: Optional[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)
