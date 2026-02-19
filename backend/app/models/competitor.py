"""
Competitor model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Competitor(Base):
    """Competitor model for tracking companies to monitor"""
    
    __tablename__ = "competitors"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Competitor info
    name = Column(String(255), nullable=False, index=True)
    domain = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Logo/branding
    logo_url = Column(String(500), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization", back_populates="competitors")
    
    # Relationships
    monitored_pages = relationship("MonitoredPage", back_populates="competitor", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Competitor(id={self.id}, name={self.name}, domain={self.domain})>"
