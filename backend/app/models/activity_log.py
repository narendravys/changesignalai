from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    action_type = Column(String, nullable=False)  # "change_detected", "page_added", "comment_added", etc.
    description = Column(Text, nullable=False)
    entity_type = Column(String, nullable=True)  # "change_event", "monitored_page", "competitor"
    entity_id = Column(Integer, nullable=True)
    
    extra_data = Column(JSON, nullable=True)  # Renamed from 'metadata' (reserved by SQLAlchemy)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    organization = relationship("Organization")
    user = relationship("User")
