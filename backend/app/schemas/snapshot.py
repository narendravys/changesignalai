"""
Snapshot Pydantic schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SnapshotBase(BaseModel):
    """Base snapshot schema"""
    page_title: Optional[str] = None
    http_status_code: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None


class SnapshotCreate(BaseModel):
    """Schema for creating a snapshot"""
    monitored_page_id: int
    raw_html: Optional[str] = None
    cleaned_text: Optional[str] = None
    screenshot_url: Optional[str] = None
    page_title: Optional[str] = None
    http_status_code: Optional[int] = None
    content_hash: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None
    load_time_ms: Optional[int] = None
    page_size_bytes: Optional[int] = None


class SnapshotResponse(SnapshotBase):
    """Schema for snapshot response"""
    id: int
    monitored_page_id: int
    content_hash: Optional[str] = None
    load_time_ms: Optional[int] = None
    page_size_bytes: Optional[int] = None
    screenshot_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SnapshotDetail(SnapshotResponse):
    """Schema for detailed snapshot with content"""
    cleaned_text: Optional[str] = None
    raw_html: Optional[str] = None
