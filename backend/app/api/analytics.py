"""
API endpoints for analytics and insights
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.change_event import ChangeEvent, Severity, ChangeType
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.models.activity_log import ActivityLog

router = APIRouter()


@router.get("/trends")
def get_trends(
    days: int = Query(default=30, ge=1, le=365),
    changes_only: bool = Query(default=False, description="If true, only count events where changes were detected"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Get change trends over time (admin users see all organizations)"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Build base filter conditions
    base_conditions = [ChangeEvent.created_at >= start_date]
    
    # Regular users only see their organization's data
    if not current_user.is_admin and not current_user.is_superuser:
        base_conditions.append(Competitor.organization_id == current_user.organization_id)
    
    if changes_only:
        base_conditions.append(ChangeEvent.change_detected == True)
    
    # Get changes by day
    changes_by_day = db.query(
        func.date(ChangeEvent.created_at).label('date'),
        func.count(ChangeEvent.id).label('count')
    ).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(*base_conditions)
    ).group_by(
        func.date(ChangeEvent.created_at)
    ).order_by(
        func.date(ChangeEvent.created_at)
    ).all()
    
    # Get changes by severity
    changes_by_severity = db.query(
        ChangeEvent.severity,
        func.count(ChangeEvent.id).label('count')
    ).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(*base_conditions)
    ).group_by(
        ChangeEvent.severity
    ).all()
    
    # Get changes by type
    changes_by_type = db.query(
        ChangeEvent.change_type,
        func.count(ChangeEvent.id).label('count')
    ).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(*base_conditions)
    ).group_by(
        ChangeEvent.change_type
    ).all()
    
    # Get most active competitors (pages with most monitoring activity)
    active_competitors = db.query(
        Competitor.name,
        func.count(ChangeEvent.id).label('change_count')
    ).join(
        MonitoredPage, Competitor.id == MonitoredPage.competitor_id
    ).join(
        ChangeEvent, MonitoredPage.id == ChangeEvent.monitored_page_id
    ).filter(
        and_(*base_conditions)
    ).group_by(
        Competitor.id, Competitor.name
    ).order_by(
        func.count(ChangeEvent.id).desc()
    ).limit(10).all()
    
    return {
        "period_days": days,
        "changes_by_day": [
            {"date": str(row.date), "count": row.count}
            for row in changes_by_day
        ],
        "changes_by_severity": {
            row.severity.value: row.count
            for row in changes_by_severity
        },
        "changes_by_type": {
            row.change_type.value: row.count
            for row in changes_by_type
        },
        "most_active_competitors": [
            {"name": row.name, "change_count": row.change_count}
            for row in active_competitors
        ]
    }


@router.get("/activity-feed")
def get_activity_feed(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Get recent activity feed"""
    
    activities = db.query(ActivityLog).filter(
        ActivityLog.organization_id == current_user.organization_id
    ).order_by(
        ActivityLog.created_at.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": activity.id,
            "action_type": activity.action_type,
            "description": activity.description,
            "entity_type": activity.entity_type,
            "entity_id": activity.entity_id,
            "user_id": activity.user_id,
            "metadata": activity.extra_data,  # Map extra_data to metadata for API response
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
        }
        for activity in activities
    ]


@router.get("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Get AI-powered insights and recommendations (admin users see all organizations)"""
    
    # Build base conditions for organization filtering
    org_conditions = []
    if not current_user.is_admin and not current_user.is_superuser:
        org_conditions.append(Competitor.organization_id == current_user.organization_id)
    
    # Get recent critical/high changes that are unacknowledged
    urgent_changes_filter = [
        ChangeEvent.change_detected == True,
        ChangeEvent.acknowledged == False,
        or_(
            ChangeEvent.severity == Severity.CRITICAL,
            ChangeEvent.severity == Severity.HIGH
        )
    ] + org_conditions
    
    urgent_changes = db.query(ChangeEvent).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(*urgent_changes_filter)
    ).order_by(
        ChangeEvent.created_at.desc()
    ).limit(5).all()
    
    # Calculate response time (time to acknowledge)
    response_time_filter = [
        ChangeEvent.acknowledged == True,
        ChangeEvent.acknowledged_at.isnot(None)
    ] + org_conditions
    
    avg_response_time = db.query(
        func.avg(
            func.extract('epoch', ChangeEvent.acknowledged_at - ChangeEvent.created_at)
        )
    ).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(*response_time_filter)
    ).scalar()
    
    # Get monitoring health
    total_pages_query = db.query(func.count(MonitoredPage.id)).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    )
    if org_conditions:
        total_pages_query = total_pages_query.filter(and_(*org_conditions))
    total_pages = total_pages_query.scalar()
    
    active_pages_query = db.query(func.count(MonitoredPage.id)).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(MonitoredPage.is_active == True)
    if org_conditions:
        active_pages_query = active_pages_query.filter(and_(*org_conditions))
    active_pages = active_pages_query.scalar()
    
    return {
        "urgent_action_required": len(urgent_changes),
        "urgent_changes": [
            {
                "id": change.id,
                "severity": change.severity.value,
                "summary": change.summary,
                "competitor_name": change.monitored_page.competitor.name if change.monitored_page and change.monitored_page.competitor else "Unknown",
                "created_at": change.created_at.isoformat() if change.created_at else None,
            }
            for change in urgent_changes
        ],
        "avg_response_time_hours": round(avg_response_time / 3600, 2) if avg_response_time else None,
        "monitoring_health": {
            "total_pages": total_pages or 0,
            "active_pages": active_pages or 0,
            "health_percentage": round((active_pages / total_pages * 100), 1) if total_pages > 0 else 0
        }
    }


@router.get("/export/csv")
def export_changes_csv(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Export changes to CSV format"""
    
    from io import StringIO
    import csv
    from fastapi.responses import StreamingResponse
    
    # Build query
    query = db.query(ChangeEvent).join(
        MonitoredPage, ChangeEvent.monitored_page_id == MonitoredPage.id
    ).join(
        Competitor, MonitoredPage.competitor_id == Competitor.id
    ).filter(
        and_(
            Competitor.organization_id == current_user.organization_id,
            ChangeEvent.change_detected == True
        )
    )
    
    # Apply date filters
    if start_date:
        query = query.filter(ChangeEvent.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(ChangeEvent.created_at <= datetime.fromisoformat(end_date))
    
    changes = query.order_by(ChangeEvent.created_at.desc()).all()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Date', 'Competitor', 'Page URL', 'Severity', 'Change Type',
        'Summary', 'Business Impact', 'Recommended Action', 'Acknowledged'
    ])
    
    # Write data
    for change in changes:
        writer.writerow([
            change.created_at.isoformat() if change.created_at else '',
            change.monitored_page.competitor.name if change.monitored_page and change.monitored_page.competitor else '',
            change.monitored_page.url if change.monitored_page else '',
            change.severity.value,
            change.change_type.value,
            change.summary or '',
            change.business_impact or '',
            change.recommended_action or '',
            'Yes' if change.acknowledged else 'No'
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=changesignal_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )
