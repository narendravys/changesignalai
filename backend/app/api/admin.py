"""
Admin API routes for managing users, subscriptions, feedback, and system configuration
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_admin_user
from app.models.user import User, SubscriptionStatus
from app.models.organization import Organization
from app.models.feedback import Feedback, FeedbackStatus
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.models.change_event import ChangeEvent
from app.models.activity_log import ActivityLog
from app.schemas.admin import (
    UserListResponse, UserSubscriptionUpdate, SubscriptionConfigUpdate,
    SystemStatsResponse, UserActivityResponse
)
from app.schemas.feedback import FeedbackResponse, FeedbackUpdate
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/users", response_model=List[UserListResponse])
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    subscription_status: Optional[SubscriptionStatus] = None,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all users in the system (Admin only)
    """
    query = db.query(User).join(Organization)
    
    # Apply filters
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
    
    if subscription_status:
        query = query.filter(User.subscription_status == subscription_status)
    
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    # Enrich with organization name
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "is_superuser": user.is_superuser,
            "subscription_status": user.subscription_status,
            "trial_ends_at": user.trial_ends_at,
            "subscription_ends_at": user.subscription_ends_at,
            "organization_id": user.organization_id,
            "organization_name": user.organization.name if user.organization else None,
            "created_at": user.created_at,
            "last_login": user.last_login
        }
        result.append(UserListResponse(**user_dict))
    
    return result


@router.get("/users/{user_id}", response_model=UserListResponse)
async def get_user_details(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_superuser=user.is_superuser,
        subscription_status=user.subscription_status,
        trial_ends_at=user.trial_ends_at,
        subscription_ends_at=user.subscription_ends_at,
        organization_id=user.organization_id,
        organization_name=user.organization.name if user.organization else None,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.patch("/users/{user_id}/subscription", response_model=UserListResponse)
async def update_user_subscription(
    user_id: int,
    update_data: UserSubscriptionUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update user subscription (Admin only)
    Can manually extend trials, activate/cancel subscriptions
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Update subscription status
        if update_data.subscription_status:
            user.subscription_status = update_data.subscription_status
        
        # Update trial end date
        if update_data.trial_ends_at:
            user.trial_ends_at = update_data.trial_ends_at
        
        # Update subscription end date
        if update_data.subscription_ends_at:
            user.subscription_ends_at = update_data.subscription_ends_at
        
        # Extend subscription by N days
        if update_data.extend_days:
            if user.subscription_status == SubscriptionStatus.TRIAL and user.trial_ends_at:
                user.trial_ends_at = user.trial_ends_at + timedelta(days=update_data.extend_days)
            elif user.subscription_status == SubscriptionStatus.ACTIVE and user.subscription_ends_at:
                user.subscription_ends_at = user.subscription_ends_at + timedelta(days=update_data.extend_days)
            else:
                # Set new end date from now
                if user.subscription_status == SubscriptionStatus.TRIAL:
                    user.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=update_data.extend_days)
                else:
                    user.subscription_ends_at = datetime.now(timezone.utc) + timedelta(days=update_data.extend_days)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Admin {current_user.email} updated subscription for user {user.email}")
        
        return UserListResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            is_superuser=user.is_superuser,
            subscription_status=user.subscription_status,
            trial_ends_at=user.trial_ends_at,
            subscription_ends_at=user.subscription_ends_at,
            organization_id=user.organization_id,
            organization_name=user.organization.name if user.organization else None,
            created_at=user.created_at,
            last_login=user.last_login
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subscription"
        )


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system-wide statistics (Admin only)
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    trial_users = db.query(func.count(User.id)).filter(User.subscription_status == SubscriptionStatus.TRIAL).scalar() or 0
    paid_users = db.query(func.count(User.id)).filter(User.subscription_status == SubscriptionStatus.ACTIVE).scalar() or 0
    expired_users = db.query(func.count(User.id)).filter(User.subscription_status.in_([SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED])).scalar() or 0
    
    total_orgs = db.query(func.count(Organization.id)).scalar() or 0
    total_pages = db.query(func.count(MonitoredPage.id)).scalar() or 0
    total_competitors = db.query(func.count(Competitor.id)).scalar() or 0
    total_changes = db.query(func.count(ChangeEvent.id)).scalar() or 0
    total_feedback_open = db.query(func.count(Feedback.id)).filter(Feedback.status == FeedbackStatus.OPEN).scalar() or 0
    
    # Calculate potential monthly revenue (assuming all paid users pay)
    org = db.query(Organization).first()
    monthly_price = org.monthly_price if org else 199
    revenue_potential = paid_users * monthly_price
    
    return SystemStatsResponse(
        total_users=total_users,
        active_users=active_users,
        trial_users=trial_users,
        paid_users=paid_users,
        expired_users=expired_users,
        total_organizations=total_orgs,
        total_monitored_pages=total_pages,
        total_competitors=total_competitors,
        total_change_events=total_changes,
        total_feedback_open=total_feedback_open,
        revenue_potential_monthly=revenue_potential
    )


@router.get("/feedback", response_model=List[FeedbackResponse])
async def list_all_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[FeedbackStatus] = None,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all user feedback (Admin only)
    """
    query = db.query(Feedback).join(User)
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    feedback_list = query.order_by(desc(Feedback.created_at)).offset(skip).limit(limit).all()
    
    # Enrich with user details
    result = []
    for feedback in feedback_list:
        feedback_dict = {
            "id": feedback.id,
            "user_id": feedback.user_id,
            "subject": feedback.subject,
            "description": feedback.description,
            "category": feedback.category,
            "status": feedback.status,
            "priority": feedback.priority,
            "admin_notes": feedback.admin_notes,
            "resolved_by": feedback.resolved_by,
            "resolved_at": feedback.resolved_at,
            "created_at": feedback.created_at,
            "updated_at": feedback.updated_at,
            "user_email": feedback.user.email if feedback.user else None,
            "user_name": feedback.user.full_name if feedback.user else None
        }
        result.append(FeedbackResponse(**feedback_dict))
    
    return result


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    update_data: FeedbackUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update feedback status and admin notes (Admin only)
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    try:
        if update_data.status:
            feedback.status = update_data.status
            if update_data.status == FeedbackStatus.RESOLVED:
                feedback.resolved_by = current_user.id
                feedback.resolved_at = datetime.now(timezone.utc)
        
        if update_data.priority:
            feedback.priority = update_data.priority
        
        if update_data.admin_notes is not None:
            feedback.admin_notes = update_data.admin_notes
        
        db.commit()
        db.refresh(feedback)
        
        logger.info(f"Admin {current_user.email} updated feedback {feedback_id}")
        
        return FeedbackResponse(
            id=feedback.id,
            user_id=feedback.user_id,
            subject=feedback.subject,
            description=feedback.description,
            category=feedback.category,
            status=feedback.status,
            priority=feedback.priority,
            admin_notes=feedback.admin_notes,
            resolved_by=feedback.resolved_by,
            resolved_at=feedback.resolved_at,
            created_at=feedback.created_at,
            updated_at=feedback.updated_at,
            user_email=feedback.user.email if feedback.user else None,
            user_name=feedback.user.full_name if feedback.user else None
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update feedback"
        )


@router.get("/activity", response_model=List[UserActivityResponse])
async def get_system_activity(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system-wide activity logs (Admin only)
    """
    query = db.query(ActivityLog).join(User)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    activities = query.order_by(desc(ActivityLog.timestamp)).offset(skip).limit(limit).all()
    
    result = []
    for activity in activities:
        activity_dict = {
            "user_id": activity.user_id,
            "user_email": activity.user.email if activity.user else "Unknown",
            "action": activity.action,
            "description": activity.description,
            "extra_data": activity.extra_data,
            "timestamp": activity.timestamp
        }
        result.append(UserActivityResponse(**activity_dict))
    
    return result


@router.get("/config", response_model=dict)
async def get_subscription_config(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription configuration (Admin only)
    """
    org = db.query(Organization).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found"
        )
    
    return {
        "trial_period_days": org.trial_period_days,
        "monthly_price": org.monthly_price,
        "max_competitors": org.max_competitors,
        "max_monitored_pages": org.max_monitored_pages
    }


@router.patch("/config", response_model=dict)
async def update_subscription_config(
    update_data: SubscriptionConfigUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update subscription configuration (Admin only)
    """
    org = db.query(Organization).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found"
        )
    
    try:
        if update_data.trial_period_days is not None:
            org.trial_period_days = update_data.trial_period_days
        
        if update_data.monthly_price is not None:
            org.monthly_price = update_data.monthly_price
        
        if update_data.max_competitors is not None:
            org.max_competitors = update_data.max_competitors
        
        if update_data.max_monitored_pages is not None:
            org.max_monitored_pages = update_data.max_monitored_pages
        
        db.commit()
        db.refresh(org)
        
        logger.info(f"Admin {current_user.email} updated subscription config")
        
        return {
            "message": "Configuration updated successfully",
            "trial_period_days": org.trial_period_days,
            "monthly_price": org.monthly_price,
            "max_competitors": org.max_competitors,
            "max_monitored_pages": org.max_monitored_pages
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update configuration"
        )
