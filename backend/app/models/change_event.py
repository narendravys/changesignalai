"""
Change Event model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class ChangeType(str, Enum):
    """Type of change detected"""
    PRICING = "pricing"
    FEATURES = "features"
    POLICY = "policy"
    CONTENT = "content"
    LAYOUT = "layout"
    OTHER = "other"


class Severity(str, Enum):
    """Severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChangeEvent(Base):
    """Change Event model for tracking detected changes"""
    
    __tablename__ = "change_events"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Change detection
    change_detected = Column(Boolean, default=False, nullable=False)
    summary = Column(Text, nullable=True)
    
    # Classification (values_callable so PostgreSQL gets 'low'/'pricing' not 'LOW'/'PRICING')
    change_type = Column(
        SQLEnum(ChangeType, name="change_type_enum", values_callable=lambda x: [e.value for e in x]),
        default=ChangeType.OTHER,
        nullable=False,
        index=True
    )
    severity = Column(
        SQLEnum(Severity, name="severity_enum", values_callable=lambda x: [e.value for e in x]),
        default=Severity.LOW,
        nullable=False,
        index=True
    )
    severity_score = Column(Integer, default=1, nullable=False)  # 1-4 numeric score
    
    # Hybrid engine metadata
    structured_diff = Column(JSON, nullable=True)  # Deterministic structured diff
    llm_analysis = Column(JSON, nullable=True)     # Groq LLM JSON analysis
    requires_llm = Column(Boolean, default=False, nullable=False)
    confidence = Column(Float, nullable=True)
    
    # AI analysis
    business_impact = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    
    # LLM response (full JSON)
    llm_response = Column(JSON, nullable=True)
    
    # Additional metadata
    diff_preview = Column(Text, nullable=True)  # Short preview of changes
    human_readable_comparison = Column(Text, nullable=True)  # In-depth human narrative of what changed
    
    # Relationships
    monitored_page_id = Column(Integer, ForeignKey("monitored_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    monitored_page = relationship("MonitoredPage", back_populates="change_events")
    
    snapshot_id = Column(Integer, ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot = relationship("Snapshot", back_populates="change_events")
    
    # Alert relationship
    alerts = relationship("Alert", back_populates="change_event", cascade="all, delete-orphan")
    
    # Team collaboration
    comments = relationship("Comment", back_populates="change_event", cascade="all, delete-orphan")
    
    # Acknowledgment
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, nullable=True)  # User ID
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<ChangeEvent(id={self.id}, type={self.change_type}, severity={self.severity})>"
