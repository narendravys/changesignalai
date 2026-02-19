"""
Feedback API routes for users to submit and view their feedback
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """
    Submit new feedback (bug report, feature request, etc.)
    """
    try:
        new_feedback = Feedback(
            user_id=current_user.id,
            subject=feedback_data.subject,
            description=feedback_data.description,
            category=feedback_data.category
        )
        
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)
        
        logger.info(f"User {current_user.email} submitted feedback: {feedback_data.subject}")
        
        return FeedbackResponse(
            id=new_feedback.id,
            user_id=new_feedback.user_id,
            subject=new_feedback.subject,
            description=new_feedback.description,
            category=new_feedback.category,
            status=new_feedback.status,
            priority=new_feedback.priority,
            admin_notes=new_feedback.admin_notes,
            resolved_by=new_feedback.resolved_by,
            resolved_at=new_feedback.resolved_at,
            created_at=new_feedback.created_at,
            updated_at=new_feedback.updated_at,
            user_email=current_user.email,
            user_name=current_user.full_name
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )


@router.get("/my", response_model=List[FeedbackResponse])
async def get_my_feedback(
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """
    Get all feedback submitted by the current user
    """
    feedback_list = db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(desc(Feedback.created_at)).all()
    
    result = []
    for feedback in feedback_list:
        result.append(FeedbackResponse(
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
            user_email=current_user.email,
            user_name=current_user.full_name
        ))
    
    return result


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(
    feedback_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """
    Get a specific feedback item (only if owned by current user or user is admin)
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Check if user owns this feedback or is admin
    if feedback.user_id != current_user.id and not current_user.is_admin and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this feedback"
        )
    
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
