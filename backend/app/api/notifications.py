"""
API endpoints for notification preferences
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.notification_preference import NotificationPreference
from app.schemas.notification import NotificationPreferenceUpdate, NotificationPreferenceResponse

router = APIRouter()


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Get current user's notification preferences"""
    
    # Get or create preferences
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(
            user_id=current_user.id,
            email_enabled=True,
            webhook_enabled=False,
            critical_changes=True,
            high_changes=True,
            medium_changes=False,
            low_changes=False,
            daily_digest=False,
            weekly_digest=True,
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return NotificationPreferenceResponse.model_validate(prefs)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    preferences: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Update notification preferences"""
    
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        # Create new preferences
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
    
    # Update fields
    update_data = preferences.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
    
    db.commit()
    db.refresh(prefs)
    
    return NotificationPreferenceResponse.model_validate(prefs)
