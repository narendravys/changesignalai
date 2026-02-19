"""
Competitor API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.competitor import Competitor
from app.models.organization import Organization
from app.schemas.competitor import (
    CompetitorCreate, CompetitorUpdate, 
    CompetitorResponse, CompetitorWithPages
)
from app.services.monitoring_service import MonitoringService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=List[CompetitorWithPages])
async def list_competitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: bool = None,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """List all competitors for current user's organization (or all if admin)"""
    
    from app.models.monitored_page import MonitoredPage
    
    query = db.query(Competitor)
    
    # Admins can see all competitors across all organizations
    if not current_user.is_admin and not current_user.is_superuser:
        query = query.filter(Competitor.organization_id == current_user.organization_id)
    
    if is_active is not None:
        query = query.filter(Competitor.is_active == is_active)
    
    competitors = query.offset(skip).limit(limit).all()
    
    # Add monitored pages count for each competitor
    result = []
    for competitor in competitors:
        pages_count = db.query(MonitoredPage).filter(
            MonitoredPage.competitor_id == competitor.id
        ).count()
        
        comp_dict = CompetitorResponse.model_validate(competitor).model_dump()
        comp_dict["monitored_pages_count"] = pages_count
        result.append(CompetitorWithPages(**comp_dict))
    
    return result


@router.get("/{competitor_id}", response_model=CompetitorWithPages)
async def get_competitor(
    competitor_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Get a specific competitor with page count"""
    
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    # Get monitored pages count
    from app.models.monitored_page import MonitoredPage
    pages_count = db.query(MonitoredPage).filter(
        MonitoredPage.competitor_id == competitor_id
    ).count()
    
    response = CompetitorWithPages.model_validate(competitor)
    response.monitored_pages_count = pages_count
    
    return response


@router.post("/", response_model=CompetitorResponse, status_code=status.HTTP_201_CREATED)
async def create_competitor(
    competitor_data: CompetitorCreate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Create a new competitor"""
    
    # Check organization limits
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    
    current_count = db.query(Competitor).filter(
        Competitor.organization_id == current_user.organization_id
    ).count()
    
    if current_count >= org.max_competitors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization limit reached ({org.max_competitors} competitors)"
        )
    
    # Create competitor
    competitor = Competitor(
        **competitor_data.model_dump(),
        organization_id=current_user.organization_id
    )
    
    try:
        db.add(competitor)
        db.commit()
        db.refresh(competitor)
        
        logger.info(f"Competitor created: {competitor.name} (ID: {competitor.id})")
        return CompetitorResponse.model_validate(competitor)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating competitor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create competitor"
        )


@router.patch("/{competitor_id}", response_model=CompetitorResponse)
async def update_competitor(
    competitor_id: int,
    competitor_update: CompetitorUpdate,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Update a competitor"""
    
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    # Update fields
    update_data = competitor_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(competitor, field, value)
    
    try:
        db.commit()
        db.refresh(competitor)
        
        logger.info(f"Competitor updated: {competitor.name} (ID: {competitor.id})")
        return CompetitorResponse.model_validate(competitor)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating competitor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update competitor"
        )


@router.delete("/{competitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competitor(
    competitor_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Delete a competitor"""
    
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    try:
        db.delete(competitor)
        db.commit()
        
        logger.info(f"Competitor deleted: {competitor.name} (ID: {competitor.id})")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting competitor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete competitor"
        )


@router.get("/{competitor_id}/stats")
async def get_competitor_stats(
    competitor_id: int,
    current_user: User = Depends(get_current_user_with_subscription),
    db: Session = Depends(get_db)
):
    """Get statistics for a competitor"""
    
    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_id,
        Competitor.organization_id == current_user.organization_id
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found"
        )
    
    monitoring_service = MonitoringService(db)
    stats = monitoring_service.get_competitor_stats(competitor_id)
    
    return stats
