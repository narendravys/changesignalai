"""
Pydantic schemas for comments
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class CommentCreate(BaseModel):
    """Schema for creating a comment"""
    change_event_id: int
    content: str


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: int
    change_event_id: int
    user_id: int
    content: str
    created_at: datetime
    updated_at: datetime
    
    # Additional fields added by API
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
