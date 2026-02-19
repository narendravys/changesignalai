from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Notification channels
    email_enabled = Column(Boolean, default=True)
    webhook_enabled = Column(Boolean, default=False)
    webhook_url = Column(String, nullable=True)
    
    # Notification triggers
    critical_changes = Column(Boolean, default=True)
    high_changes = Column(Boolean, default=True)
    medium_changes = Column(Boolean, default=False)
    low_changes = Column(Boolean, default=False)
    
    # Digest settings
    daily_digest = Column(Boolean, default=False)
    weekly_digest = Column(Boolean, default=True)
    
    # Custom rules (JSON)
    custom_rules = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")
