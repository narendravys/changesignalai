"""
Subscription and payment API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, SubscriptionStatus
from app.models.organization import Organization
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class SubscriptionStatusResponse(BaseModel):
    """Response model for subscription status"""
    subscription_status: str
    trial_ends_at: Optional[datetime]
    subscription_ends_at: Optional[datetime]
    days_remaining: Optional[int]
    is_active: bool
    monthly_price: int


class CreateCheckoutSessionRequest(BaseModel):
    """Request model for creating a checkout session"""
    success_url: str
    cancel_url: str


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's subscription status
    """
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    monthly_price = org.monthly_price if org else 199
    
    # Calculate days remaining
    days_remaining = None
    now = datetime.now(timezone.utc)
    
    if current_user.subscription_status == SubscriptionStatus.TRIAL and current_user.trial_ends_at:
        delta = current_user.trial_ends_at - now
        days_remaining = max(0, delta.days)
    elif current_user.subscription_status == SubscriptionStatus.ACTIVE and current_user.subscription_ends_at:
        delta = current_user.subscription_ends_at - now
        days_remaining = max(0, delta.days)
    
    return SubscriptionStatusResponse(
        subscription_status=current_user.subscription_status.value,
        trial_ends_at=current_user.trial_ends_at,
        subscription_ends_at=current_user.subscription_ends_at,
        days_remaining=days_remaining,
        is_active=current_user.has_active_subscription,
        monthly_price=monthly_price
    )


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe checkout session for subscription
    
    NOTE: This is a placeholder. In production, you would:
    1. Install stripe: pip install stripe
    2. Set STRIPE_SECRET_KEY in .env
    3. Create actual Stripe checkout session
    4. Handle webhooks for payment confirmation
    """
    # TODO: Implement actual Stripe integration
    # For now, return a mock response
    
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    monthly_price = org.monthly_price if org else 199
    
    logger.warning(f"Stripe checkout requested by {current_user.email} - using mock implementation")
    
    return {
        "checkout_url": f"/mock-checkout?user_id={current_user.id}&price={monthly_price}",
        "session_id": "mock_session_id",
        "message": "This is a mock checkout. Implement Stripe integration for production."
    }


@router.post("/webhook")
async def stripe_webhook(db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events
    
    NOTE: This is a placeholder. In production, you would:
    1. Verify the webhook signature
    2. Handle different event types (checkout.session.completed, invoice.paid, etc.)
    3. Update user subscription status in database
    """
    # TODO: Implement actual Stripe webhook handling
    logger.warning("Stripe webhook called - using mock implementation")
    
    return {"status": "received"}


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Cancel user subscription
    """
    try:
        # TODO: Cancel subscription in Stripe
        
        current_user.subscription_status = SubscriptionStatus.CANCELLED
        
        db.commit()
        
        logger.info(f"User {current_user.email} cancelled subscription")
        
        return {
            "message": "Subscription cancelled successfully",
            "subscription_status": current_user.subscription_status.value
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.post("/reactivate")
async def reactivate_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Reactivate a cancelled subscription
    """
    try:
        # TODO: Reactivate subscription in Stripe
        
        if current_user.subscription_status == SubscriptionStatus.CANCELLED:
            current_user.subscription_status = SubscriptionStatus.ACTIVE
            
            # Extend subscription by 30 days
            if not current_user.subscription_ends_at or current_user.subscription_ends_at < datetime.now(timezone.utc):
                current_user.subscription_ends_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            db.commit()
            
            logger.info(f"User {current_user.email} reactivated subscription")
            
            return {
                "message": "Subscription reactivated successfully",
                "subscription_status": current_user.subscription_status.value,
                "subscription_ends_at": current_user.subscription_ends_at.isoformat()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription is not cancelled"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reactivating subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reactivate subscription"
        )
