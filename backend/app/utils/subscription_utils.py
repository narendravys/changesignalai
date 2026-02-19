"""
Subscription helpers for backend (e.g. check if org has active subscriber).
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.user import User, SubscriptionStatus


def org_has_active_subscriber(db: Session, organization_id: int) -> bool:
    """
    Return True if the organization has at least one user with an active
    subscription or trial (so scraping/checks should run). History is never
    deleted; this only controls whether background work runs.
    """
    now = datetime.now(timezone.utc)
    q = db.query(User.id).filter(
        User.organization_id == organization_id,
        or_(
            and_(
                User.subscription_status == SubscriptionStatus.TRIAL,
                User.trial_ends_at.isnot(None),
                User.trial_ends_at > now,
            ),
            and_(
                User.subscription_status == SubscriptionStatus.ACTIVE,
                User.subscription_ends_at.isnot(None),
                User.subscription_ends_at > now,
            ),
        ),
    ).limit(1)
    return q.first() is not None


def get_organization_ids_with_active_subscriber(db: Session):
    """Return set of organization IDs that have at least one active subscriber."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(User.organization_id)
        .filter(
            or_(
                and_(
                    User.subscription_status == SubscriptionStatus.TRIAL,
                    User.trial_ends_at.isnot(None),
                    User.trial_ends_at > now,
                ),
                and_(
                    User.subscription_status == SubscriptionStatus.ACTIVE,
                    User.subscription_ends_at.isnot(None),
                    User.subscription_ends_at > now,
                ),
            )
        )
        .distinct()
        .all()
    )
    return {r[0] for r in rows}
