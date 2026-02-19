"""
Monitored Pages API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.models.organization import Organization
from app.schemas.monitored_page import (
    MonitoredPageCreate, MonitoredPageUpdate, 
    MonitoredPageResponse, MonitoredPageWithCompetitor
)
from app.utils.validators import validate_url
from app.utils.logger import get_logger
from app.workers.tasks import check_monitored_page

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=List[MonitoredPageWithCompetitor])
async def list_monitored_pages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    competitor_id: int = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """List all monitored pages for current user's organization (or all if admin)"""
    
    query = db.query(MonitoredPage).join(Competitor)
    
    # Admins can see all pages across all organizations
    if not current_user.is_admin and not current_user.is_superuser:
        query = query.filter(Competitor.organization_id == current_user.organization_id)
    
    if competitor_id:
        query = query.filter(MonitoredPage.competitor_id == competitor_id)
    
    if is_active is not None:
        query = query.filter(MonitoredPage.is_active == is_active)
    
    pages = query.offset(skip).limit(limit).all()
    
    # Add competitor info
    result = []
    for page in pages:
        # First convert to dict using MonitoredPageResponse
        page_dict = MonitoredPageResponse.model_validate(page).model_dump()
        # Then add competitor fields
        page_dict["competitor_name"] = page.competitor.name
        page_dict["competitor_domain"] = page.competitor.domain
        # Finally create MonitoredPageWithCompetitor object
        result.append(MonitoredPageWithCompetitor(**page_dict))
    
    return result


@router.get("/{page_id}", response_model=MonitoredPageResponse)
async def get_monitored_page(
    page_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Get a specific monitored page"""
    
    page = db.query(MonitoredPage).join(Competitor).filter(
        MonitoredPage.id == page_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitored page not found"
        )
    
    return MonitoredPageResponse.model_validate(page)


@router.post("/", response_model=MonitoredPageResponse, status_code=status.HTTP_201_CREATED)
async def create_monitored_page(
    page_data: MonitoredPageCreate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Create a new monitored page"""
    
    # Validate URL
    if not validate_url(page_data.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format"
        )
    
    # Check if competitor belongs to user's organization
    competitor = db.query(Competitor).filter(
        Competitor.id == page_data.competitor_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    # Check organization limits
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    
    current_count = db.query(MonitoredPage).join(Competitor).filter(
        Competitor.organization_id == current_user.organization_id
    ).count()
    
    if current_count >= org.max_monitored_pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization limit reached ({org.max_monitored_pages} pages)"
        )
    
    # Create monitored page
    page = MonitoredPage(**page_data.model_dump())
    
    try:
        db.add(page)
        db.commit()
        db.refresh(page)
        
        logger.info(f"Monitored page created: {page.url} (ID: {page.id})")
        return MonitoredPageResponse.model_validate(page)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating monitored page: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create monitored page"
        )


@router.patch("/{page_id}", response_model=MonitoredPageResponse)
async def update_monitored_page(
    page_id: int,
    page_update: MonitoredPageUpdate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Update a monitored page"""
    
    page = db.query(MonitoredPage).join(Competitor).filter(
        MonitoredPage.id == page_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitored page not found"
        )
    
    # Validate URL if being updated
    update_data = page_update.model_dump(exclude_unset=True)
    if "url" in update_data and not validate_url(update_data["url"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format"
        )
    
    # Update fields
    for field, value in update_data.items():
        setattr(page, field, value)
    
    try:
        db.commit()
        db.refresh(page)
        
        logger.info(f"Monitored page updated: {page.url} (ID: {page.id})")
        return MonitoredPageResponse.model_validate(page)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating monitored page: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update monitored page"
        )


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_monitored_page(
    page_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Delete a monitored page"""
    
    page = db.query(MonitoredPage).join(Competitor).filter(
        MonitoredPage.id == page_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitored page not found"
        )
    
    try:
        db.delete(page)
        db.commit()
        
        logger.info(f"Monitored page deleted: {page.url} (ID: {page.id})")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting monitored page: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete monitored page"
        )


@router.post("/{page_id}/check")
async def trigger_page_check(
    page_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Manually trigger a check for a monitored page"""
    
    page = db.query(MonitoredPage).join(Competitor).filter(
        MonitoredPage.id == page_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitored page not found"
        )
    
    # Queue the check task
    check_monitored_page.delay(page_id)
    
    logger.info(f"Manual check queued for page: {page.url} (ID: {page.id})")
    
    return {
        "message": "Check queued successfully",
        "page_id": page_id,
        "url": page.url
    }
