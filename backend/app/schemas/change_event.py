"""
Change Event Pydantic schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.change_event import ChangeType, Severity


class ChangeEventBase(BaseModel):
    """Base change event schema"""
    change_detected: bool
    summary: Optional[str] = None
    change_type: ChangeType
    severity: Severity
    business_impact: Optional[str] = None
    recommended_action: Optional[str] = None


class ChangeEventCreate(ChangeEventBase):
    """Schema for creating a change event"""
    monitored_page_id: int
    snapshot_id: int
    severity_score: int
    llm_response: Optional[Dict[str, Any]] = None
    diff_preview: Optional[str] = None


class ChangeEventUpdate(BaseModel):
    """Schema for updating a change event"""
    acknowledged: Optional[bool] = None
    acknowledged_by: Optional[int] = None


class ChangeEventResponse(ChangeEventBase):
    """Schema for change event response"""
    id: int
    monitored_page_id: int
    snapshot_id: int
    severity_score: int
    diff_preview: Optional[str] = None
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChangeEventDetail(ChangeEventResponse):
    """Schema for detailed change event"""
    llm_response: Optional[Dict[str, Any]] = None
    page_url: Optional[str] = None
    competitor_name: Optional[str] = None
    snapshot_has_screenshot: Optional[bool] = None


class ChangeEventFilter(BaseModel):
    """Schema for filtering change events"""
    severity: Optional[Severity] = None
    change_type: Optional[ChangeType] = None
    acknowledged: Optional[bool] = None
    competitor_id: Optional[int] = None
    monitored_page_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
