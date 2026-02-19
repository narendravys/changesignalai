"""
Feedback model for user feedback and support tickets
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class FeedbackStatus(str, enum.Enum):
    """Feedback status enum"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class FeedbackPriority(str, enum.Enum):
    """Feedback priority enum"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Feedback(Base):
    """Feedback model for user support and feature requests"""
    
    __tablename__ = "feedback"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="feedback", foreign_keys=[user_id])
    
    # Feedback details
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    status = Column(ENUM(FeedbackStatus, name='feedbackstatus', create_type=False, values_callable=lambda x: [e.value for e in x]), default=FeedbackStatus.OPEN, nullable=False)
    priority = Column(ENUM(FeedbackPriority, name='feedbackpriority', create_type=False, values_callable=lambda x: [e.value for e in x]), default=FeedbackPriority.MEDIUM, nullable=False)
    
    # Admin response
    admin_notes = Column(Text, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolver = relationship("User", foreign_keys=[resolved_by])
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, user={self.user_id}, status={self.status})>"
