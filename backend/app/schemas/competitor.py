"""
Competitor Pydantic schemas
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime


class CompetitorBase(BaseModel):
    """Base competitor schema"""
    name: str = Field(min_length=1, max_length=255)
    domain: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None


class CompetitorCreate(CompetitorBase):
    """Schema for creating a competitor"""
    pass


class CompetitorUpdate(BaseModel):
    """Schema for updating a competitor"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class CompetitorResponse(CompetitorBase):
    """Schema for competitor response"""
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CompetitorWithPages(CompetitorResponse):
    """Schema for competitor with monitored pages count"""
    monitored_pages_count: int = 0
