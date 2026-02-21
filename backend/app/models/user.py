"""
User model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SubscriptionStatus(str, enum.Enum):
    """Subscription status enum"""
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class User(Base):
    """User model for authentication and authorization"""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User info
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Subscription
    subscription_status = Column(ENUM(SubscriptionStatus, name='subscriptionstatus', create_type=False, values_callable=lambda x: [e.value for e in x]), default=SubscriptionStatus.TRIAL, nullable=False)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    subscription_ends_at = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="users")
    
    # New relationships
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False)
    comments = relationship("Comment", back_populates="user")
    feedback = relationship("Feedback", back_populates="user", foreign_keys="[Feedback.user_id]")
    
    # Password reset (for forgot-password flow)
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    @property
    def has_active_subscription(self) -> bool:
        """Check if user has an active subscription or trial"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        if self.subscription_status == SubscriptionStatus.TRIAL:
            return bool(self.trial_ends_at and self.trial_ends_at > now)
        elif self.subscription_status == SubscriptionStatus.ACTIVE:
            return bool(self.subscription_ends_at and self.subscription_ends_at > now)
        return False
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, org={self.organization_id})>"
