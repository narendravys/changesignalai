"""
Alert model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class AlertChannel(str, Enum):
    """Alert delivery channels (values must match PostgreSQL alert_channel_enum: lowercase)."""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"


class AlertStatus(str, Enum):
    """Alert delivery status (values must match PostgreSQL alert_status_enum: lowercase)."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRY = "retry"


class Alert(Base):
    """Alert model for tracking notification delivery"""
    
    __tablename__ = "alerts"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Alert details (values_callable ensures PostgreSQL gets lowercase values)
    channel = Column(
        SQLEnum(AlertChannel, name="alert_channel_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    status = Column(
        SQLEnum(AlertStatus, name="alert_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=AlertStatus.PENDING,
        nullable=False,
        index=True
    )
    
    # Recipients
    recipient = Column(String(500), nullable=True)  # Email address, Slack channel, etc.
    
    # Content
    subject = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    
    # Delivery metadata
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # Response data (for debugging)
    response_data = Column(JSON, nullable=True)
    
    # Change event relationship
    change_event_id = Column(Integer, ForeignKey("change_events.id", ondelete="CASCADE"), nullable=False, index=True)
    change_event = relationship("ChangeEvent", back_populates="alerts")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Alert(id={self.id}, channel={self.channel}, status={self.status})>"
