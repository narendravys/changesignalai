"""
Organization model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Organization(Base):
    """Organization model for multi-tenant support"""
    
    __tablename__ = "organizations"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Organization info
    name = Column(String(255), unique=True, index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Settings
    is_active = Column(Boolean, default=True, nullable=False)
    max_competitors = Column(Integer, default=10, nullable=False)
    max_monitored_pages = Column(Integer, default=50, nullable=False)
    
    # Subscription settings (admin configurable)
    trial_period_days = Column(Integer, default=14, nullable=False)
    monthly_price = Column(Integer, default=199, nullable=False)
    
    # Contact info
    contact_email = Column(String(255), nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="organization", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name})>"
