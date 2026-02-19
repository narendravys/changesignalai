"""
Snapshot model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Snapshot(Base):
    """Snapshot model for storing page content at a point in time"""
    
    __tablename__ = "snapshots"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Content storage
    raw_html = Column(Text, nullable=True)  # Full HTML
    cleaned_text = Column(Text, nullable=True)  # Extracted visible text
    screenshot_url = Column(String(1000), nullable=True)  # Optional screenshot path/URL
    
    # Metadata
    page_title = Column(String(500), nullable=True)
    http_status_code = Column(Integer, nullable=True)
    content_hash = Column(String(64), nullable=True, index=True)  # SHA256 hash for quick comparison
    
    # Success/error tracking
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Performance metrics
    load_time_ms = Column(Integer, nullable=True)
    page_size_bytes = Column(Integer, nullable=True)
    
    # Monitored page relationship
    monitored_page_id = Column(Integer, ForeignKey("monitored_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    monitored_page = relationship("MonitoredPage", back_populates="snapshots")
    
    # Relationships
    change_events = relationship("ChangeEvent", back_populates="snapshot", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<Snapshot(id={self.id}, page_id={self.monitored_page_id}, created={self.created_at})>"
