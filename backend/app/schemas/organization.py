"""
Organization Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class OrganizationBase(BaseModel):
    """Base organization schema"""
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    contact_email: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization"""
    max_competitors: Optional[int] = 10
    max_monitored_pages: Optional[int] = 50


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None
    max_competitors: Optional[int] = None
    max_monitored_pages: Optional[int] = None


class OrganizationResponse(OrganizationBase):
    """Schema for organization response"""
    id: int
    is_active: bool
    max_competitors: int
    max_monitored_pages: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrganizationRegister(BaseModel):
    """Schema for registering a new organization with admin user"""
    org_name: str = Field(min_length=1, max_length=255)
    org_slug: str = Field(min_length=1, max_length=255)
    user_email: str = Field(min_length=1)
    user_password: str = Field(min_length=8)
    user_full_name: Optional[str] = None
