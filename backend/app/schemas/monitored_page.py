"""
Monitored Page Pydantic schemas
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime
from app.models.monitored_page import CheckFrequency


class MonitoredPageBase(BaseModel):
    """Base monitored page schema"""
    url: str = Field(min_length=1, max_length=1000)
    page_title: Optional[str] = Field(None, max_length=500)
    page_type: Optional[str] = Field(None, max_length=100)
    check_frequency: CheckFrequency = CheckFrequency.DAILY
    notes: Optional[str] = None


class MonitoredPageCreate(MonitoredPageBase):
    """Schema for creating a monitored page"""
    competitor_id: int


class MonitoredPageUpdate(BaseModel):
    """Schema for updating a monitored page"""
    url: Optional[str] = Field(None, min_length=1, max_length=1000)
    page_title: Optional[str] = Field(None, max_length=500)
    page_type: Optional[str] = Field(None, max_length=100)
    check_frequency: Optional[CheckFrequency] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class MonitoredPageResponse(MonitoredPageBase):
    """Schema for monitored page response"""
    id: int
    competitor_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_checked_at: Optional[datetime] = None
    next_check_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MonitoredPageWithCompetitor(MonitoredPageResponse):
    """Schema for monitored page with competitor info"""
    competitor_name: str
    competitor_domain: str
