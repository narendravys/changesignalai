"""
Monitored Page model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class CheckFrequency(str, Enum):
    """Monitoring frequency options"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"


class MonitoredPage(Base):
    """Monitored Page model for tracking specific URLs"""
    
    __tablename__ = "monitored_pages"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Page info
    url = Column(String(1000), nullable=False)
    page_title = Column(String(500), nullable=True)
    page_type = Column(String(100), nullable=True)  # e.g., "pricing", "features", "terms"
    
    # Monitoring settings
    check_frequency = Column(
        SQLEnum(CheckFrequency, name="check_frequency_enum"),
        default=CheckFrequency.DAILY,
        nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    notes = Column(Text, nullable=True)
    
    # Competitor relationship
    competitor_id = Column(Integer, ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False, index=True)
    competitor = relationship("Competitor", back_populates="monitored_pages")
    
    # Relationships
    snapshots = relationship("Snapshot", back_populates="monitored_page", cascade="all, delete-orphan")
    change_events = relationship("ChangeEvent", back_populates="monitored_page", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    next_check_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<MonitoredPage(id={self.id}, url={self.url}, frequency={self.check_frequency})>"
