"""
Monitoring service for checking pages and creating snapshots
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.monitored_page import MonitoredPage, CheckFrequency
from app.models.snapshot import Snapshot
from app.models.competitor import Competitor
from app.schemas.snapshot import SnapshotCreate
from app.services.scraper_service import ScraperService
from app.utils.logger import get_logger
from app.utils.subscription_utils import get_organization_ids_with_active_subscriber

logger = get_logger(__name__)


class MonitoringService:
    """Service for monitoring pages and managing snapshots"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def check_page(
        self, 
        monitored_page: MonitoredPage,
        scraper: ScraperService
    ) -> Optional[Snapshot]:
        """
        Check a monitored page and create a snapshot
        
        Args:
            monitored_page: MonitoredPage instance to check
            scraper: ScraperService instance
            
        Returns:
            Snapshot instance or None if failed
        """
        logger.info(f"Checking page: {monitored_page.url}")
        
        try:
            # Scrape the page
            scrape_result = await scraper.scrape_page(monitored_page.url)
            
            # Create snapshot
            snapshot = Snapshot(
                monitored_page_id=monitored_page.id,
                raw_html=scrape_result.get("raw_html"),
                cleaned_text=scrape_result.get("cleaned_text"),
                page_title=scrape_result.get("page_title"),
                http_status_code=scrape_result.get("http_status_code"),
                content_hash=scrape_result.get("content_hash"),
                success=scrape_result.get("success", False),
                error_message=scrape_result.get("error_message"),
                load_time_ms=scrape_result.get("load_time_ms"),
                page_size_bytes=scrape_result.get("page_size_bytes"),
                screenshot_url=scrape_result.get("screenshot_url"),
            )
            
            self.db.add(snapshot)
            
            # Update monitored page
            monitored_page.last_checked_at = datetime.utcnow()
            monitored_page.next_check_at = self._calculate_next_check(
                monitored_page.check_frequency
            )
            
            # Update page title if we got it
            if scrape_result.get("page_title"):
                monitored_page.page_title = scrape_result.get("page_title")
            
            self.db.commit()
            self.db.refresh(snapshot)
            
            logger.info(f"Snapshot created: ID={snapshot.id}, Success={snapshot.success}")
            return snapshot
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error checking page {monitored_page.url}: {e}")
            
            # Create failed snapshot
            snapshot = Snapshot(
                monitored_page_id=monitored_page.id,
                success=False,
                error_message=str(e),
            )
            self.db.add(snapshot)
            
            monitored_page.last_checked_at = datetime.utcnow()
            monitored_page.next_check_at = self._calculate_next_check(
                monitored_page.check_frequency
            )
            
            self.db.commit()
            self.db.refresh(snapshot)
            
            return snapshot
    
    def get_previous_snapshot(
        self, 
        monitored_page_id: int,
        before_snapshot_id: Optional[int] = None
    ) -> Optional[Snapshot]:
        """
        Get the previous successful snapshot for a page
        
        Args:
            monitored_page_id: MonitoredPage ID
            before_snapshot_id: Optional snapshot ID to get snapshot before
            
        Returns:
            Previous Snapshot or None
        """
        query = self.db.query(Snapshot).filter(
            Snapshot.monitored_page_id == monitored_page_id,
            Snapshot.success == True,
            Snapshot.cleaned_text.isnot(None)
        )
        
        if before_snapshot_id:
            query = query.filter(Snapshot.id < before_snapshot_id)
        
        snapshot = query.order_by(Snapshot.created_at.desc()).first()
        return snapshot
    
    def _calculate_next_check(self, frequency: CheckFrequency) -> datetime:
        """
        Calculate next check time based on frequency
        
        Args:
            frequency: CheckFrequency enum value
            
        Returns:
            Next check datetime
        """
        now = datetime.utcnow()
        
        if frequency == CheckFrequency.HOURLY:
            return now + timedelta(hours=1)
        elif frequency == CheckFrequency.DAILY:
            return now + timedelta(days=1)
        elif frequency == CheckFrequency.WEEKLY:
            return now + timedelta(weeks=1)
        else:
            return now + timedelta(days=1)  # Default to daily
    
    def get_pages_to_check(self) -> list[MonitoredPage]:
        """
        Get all monitored pages that need to be checked.
        Only includes pages whose organization has at least one active
        subscription/trial; expired orgs are skipped (history is preserved).
        """
        now = datetime.utcnow()
        active_org_ids = get_organization_ids_with_active_subscriber(self.db)
        if not active_org_ids:
            logger.info("No organizations with active subscription - nothing to check")
            return []

        pages = (
            self.db.query(MonitoredPage)
            .join(Competitor, MonitoredPage.competitor_id == Competitor.id)
            .filter(
                MonitoredPage.is_active == True,
                Competitor.organization_id.in_(active_org_ids),
                (MonitoredPage.next_check_at.is_(None)) | (MonitoredPage.next_check_at <= now),
            )
            .all()
        )
        logger.info(f"Found {len(pages)} pages to check (orgs with active subscription)")
        return pages
    
    def get_competitor_stats(self, competitor_id: int) -> Dict[str, Any]:
        """
        Get statistics for a competitor
        
        Args:
            competitor_id: Competitor ID
            
        Returns:
            Dictionary with competitor statistics
        """
        # Get competitor
        competitor = self.db.query(Competitor).filter(
            Competitor.id == competitor_id
        ).first()
        
        if not competitor:
            return {}
        
        # Count monitored pages
        total_pages = self.db.query(MonitoredPage).filter(
            MonitoredPage.competitor_id == competitor_id
        ).count()
        
        active_pages = self.db.query(MonitoredPage).filter(
            MonitoredPage.competitor_id == competitor_id,
            MonitoredPage.is_active == True
        ).count()
        
        # Count snapshots
        from sqlalchemy import func
        total_snapshots = self.db.query(func.count(Snapshot.id)).join(
            MonitoredPage
        ).filter(
            MonitoredPage.competitor_id == competitor_id
        ).scalar()
        
        return {
            "competitor_id": competitor_id,
            "competitor_name": competitor.name,
            "total_pages": total_pages,
            "active_pages": active_pages,
            "total_snapshots": total_snapshots,
        }
