"""
Pydantic schemas for feedback
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.feedback import FeedbackStatus, FeedbackPriority


class FeedbackCreate(BaseModel):
    """Schema for creating feedback"""
    subject: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: str = Field(..., description="bug, feature_request, question, or other")


class FeedbackUpdate(BaseModel):
    """Schema for admin updating feedback"""
    status: Optional[FeedbackStatus] = None
    priority: Optional[FeedbackPriority] = None
    admin_notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Schema for feedback response"""
    id: int
    user_id: int
    subject: str
    description: str
    category: str
    status: FeedbackStatus
    priority: FeedbackPriority
    admin_notes: Optional[str]
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # User details
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    model_config = {"from_attributes": True}
