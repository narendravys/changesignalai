"""
Change Events API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.change_event import ChangeEvent, Severity, ChangeType
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.schemas.change_event import (
    ChangeEventResponse, ChangeEventDetail, 
    ChangeEventUpdate, ChangeEventFilter
)
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=List[ChangeEventDetail])
async def list_change_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    severity: Optional[Severity] = None,
    change_type: Optional[ChangeType] = None,
    acknowledged: Optional[bool] = None,
    competitor_id: Optional[int] = None,
    monitored_page_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    changes_only: bool = Query(False, description="If true, only show events where changes were detected"),
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """List all change events for current user's organization (or all if admin)"""
    
    query = db.query(ChangeEvent).join(
        MonitoredPage
    ).join(
        Competitor
    )
    
    # Admins can see all changes across all organizations
    if not current_user.is_admin and not current_user.is_superuser:
        query = query.filter(Competitor.organization_id == current_user.organization_id)
    
    # Filter by change_detected if requested
    if changes_only:
        query = query.filter(ChangeEvent.change_detected == True)
    
    # Apply filters
    if severity:
        query = query.filter(ChangeEvent.severity == severity)
    
    if change_type:
        query = query.filter(ChangeEvent.change_type == change_type)
    
    if acknowledged is not None:
        query = query.filter(ChangeEvent.acknowledged == acknowledged)
    
    if competitor_id:
        query = query.filter(Competitor.id == competitor_id)
    
    if monitored_page_id:
        query = query.filter(MonitoredPage.id == monitored_page_id)
    
    if date_from:
        query = query.filter(ChangeEvent.created_at >= date_from)
    
    if date_to:
        query = query.filter(ChangeEvent.created_at <= date_to)
    
    # Order by most recent first; eager-load snapshot for screenshot flag
    query = query.options(joinedload(ChangeEvent.snapshot)).order_by(ChangeEvent.created_at.desc())
    
    events = query.offset(skip).limit(limit).all()
    
    # Add additional info
    result = []
    for event in events:
        event_dict = ChangeEventDetail.model_validate(event).model_dump()
        event_dict["page_url"] = event.monitored_page.url
        event_dict["competitor_name"] = event.monitored_page.competitor.name
        event_dict["snapshot_has_screenshot"] = bool(event.snapshot and getattr(event.snapshot, "screenshot_url", None))
        result.append(ChangeEventDetail(**event_dict))
    
    return result


@router.get("/stats/summary")
async def get_change_summary(
    days: int = Query(7, ge=1, le=90),
    changes_only: bool = Query(False, description="If true, only count events where changes were detected"),
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Get summary statistics of changes (or all monitoring activity). Admins see all orgs."""
    
    from datetime import timedelta
    from sqlalchemy import func, and_
    
    date_from = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    base_query = db.query(ChangeEvent).join(
        MonitoredPage
    ).join(
        Competitor
    ).filter(
        ChangeEvent.created_at >= date_from
    )
    # Restrict to user's org unless admin/superuser
    if not current_user.is_admin and not current_user.is_superuser:
        base_query = base_query.filter(Competitor.organization_id == current_user.organization_id)
    
    if changes_only:
        base_query = base_query.filter(ChangeEvent.change_detected == True)
    
    # Total changes
    total_changes = base_query.count()
    
    # Changes by severity
    severity_counts = {}
    for severity in Severity:
        count = base_query.filter(ChangeEvent.severity == severity).count()
        severity_counts[severity.value] = count
    
    # Changes by type
    type_counts = {}
    for change_type in ChangeType:
        count = base_query.filter(ChangeEvent.change_type == change_type).count()
        type_counts[change_type.value] = count
    
    # Unacknowledged changes
    unacknowledged = base_query.filter(ChangeEvent.acknowledged == False).count()
    
    return {
        "period_days": days,
        "total_changes": total_changes,
        "by_severity": severity_counts,
        "by_type": type_counts,
        "unacknowledged": unacknowledged,
        "date_from": date_from.isoformat(),
        "date_to": datetime.utcnow().isoformat()
    }


@router.get("/{event_id}", response_model=ChangeEventDetail)
async def get_change_event(
    event_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Get a specific change event"""
    
    event = (
        db.query(ChangeEvent)
        .options(joinedload(ChangeEvent.snapshot))
        .join(MonitoredPage)
        .join(Competitor)
        .filter(
            ChangeEvent.id == event_id,
            Competitor.organization_id == current_user.organization_id,
        )
        .first()
    )
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change event not found"
        )
    
    event_dict = ChangeEventDetail.model_validate(event).model_dump()
    event_dict["page_url"] = event.monitored_page.url
    event_dict["competitor_name"] = event.monitored_page.competitor.name
    event_dict["snapshot_has_screenshot"] = bool(event.snapshot and getattr(event.snapshot, "screenshot_url", None))
    
    return ChangeEventDetail(**event_dict)


@router.patch("/{event_id}", response_model=ChangeEventResponse)
async def update_change_event(
    event_id: int,
    event_update: ChangeEventUpdate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Update a change event (e.g., mark as acknowledged)"""
    
    event = db.query(ChangeEvent).join(
        MonitoredPage
    ).join(
        Competitor
    ).filter(
        ChangeEvent.id == event_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change event not found"
        )
    
    # Update fields
    update_data = event_update.model_dump(exclude_unset=True)
    
    if "acknowledged" in update_data and update_data["acknowledged"]:
        event.acknowledged = True
        event.acknowledged_at = datetime.utcnow()
        event.acknowledged_by = current_user.id
    
    try:
        db.commit()
        db.refresh(event)
        
        logger.info(f"Change event updated: ID={event.id}")
        return ChangeEventResponse.model_validate(event)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating change event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update change event"
        )
