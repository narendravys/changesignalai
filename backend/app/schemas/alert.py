"""
Alert Pydantic schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.alert import AlertChannel, AlertStatus


class AlertBase(BaseModel):
    """Base alert schema"""
    channel: AlertChannel
    recipient: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None


class AlertCreate(AlertBase):
    """Schema for creating an alert"""
    change_event_id: int
    max_retries: int = 3


class AlertUpdate(BaseModel):
    """Schema for updating an alert"""
    status: Optional[AlertStatus] = None
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None


class AlertResponse(AlertBase):
    """Schema for alert response"""
    id: int
    change_event_id: int
    status: AlertStatus
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True
