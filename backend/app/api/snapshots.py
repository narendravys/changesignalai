"""
Snapshots API routes (e.g. serve screenshot for a change event's snapshot)
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.snapshot import Snapshot
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/{snapshot_id}/screenshot")
async def get_snapshot_screenshot(
    snapshot_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db),
):
    """Return the screenshot image for a snapshot if the user has access."""
    query = (
        db.query(Snapshot)
        .join(MonitoredPage)
        .join(Competitor)
        .filter(Snapshot.id == snapshot_id)
    )
    if not current_user.is_admin and not current_user.is_superuser:
        query = query.filter(Competitor.organization_id == current_user.organization_id)
    snapshot = query.first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snapshot not found",
        )
    if not snapshot.screenshot_url or not snapshot.screenshot_url.strip():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No screenshot available for this snapshot",
        )
    path = Path(snapshot.screenshot_url)
    if not path.is_absolute():
        path = Path("/app/screenshots") / path.name
    if not path.exists() or not path.is_file():
        logger.warning(f"Screenshot file missing: {path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot file not found",
        )
    return FileResponse(
        path,
        media_type="image/png",
        filename=path.name,
    )
