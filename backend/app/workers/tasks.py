"""
Celery tasks for background processing
"""
import asyncio
from datetime import datetime, timedelta
from typing import List

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.monitored_page import MonitoredPage
from app.models.change_event import ChangeEvent, Severity
from app.models.alert import Alert, AlertStatus
from app.models.snapshot import Snapshot
from app.models.notification_preference import NotificationPreference
from app.models.activity_log import ActivityLog
from app.services.scraper_service import ScraperService
from app.services.monitoring_service import MonitoringService
from app.services.change_detection_service import ChangeDetectionService
from app.services.alert_service import AlertService
from app.services.email_service import email_service
from app.services.webhook_service import webhook_service
from app.utils.logger import get_logger
from app.utils.subscription_utils import org_has_active_subscriber

logger = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.check_monitored_page")
def check_monitored_page(page_id: int) -> dict:
    """
    Check a single monitored page
    
    Args:
        page_id: MonitoredPage ID
        
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        # Get monitored page
        monitored_page = db.query(MonitoredPage).filter(
            MonitoredPage.id == page_id
        ).first()
        
        if not monitored_page:
            return {"success": False, "error": "Page not found"}
        
        if not monitored_page.is_active:
            return {"success": False, "error": "Page is not active"}
        
        # Skip if organization has no active subscription/trial (history is preserved)
        org_id = monitored_page.competitor.organization_id
        if not org_has_active_subscriber(db, org_id):
            logger.info(f"Task: Skipping page {page_id} - org {org_id} has no active subscription")
            return {"success": False, "skipped": True, "reason": "no_active_subscription"}
        
        logger.info(f"Task: Checking page {page_id} - {monitored_page.url}")
        
        # Run async scraping and analysis
        result = asyncio.run(_check_page_async(monitored_page, db))
        
        return result
        
    except Exception as e:
        logger.error(f"Error in check_monitored_page task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


async def _check_page_async(monitored_page: MonitoredPage, db) -> dict:
    """Helper function to run async operations"""
    
    async with ScraperService() as scraper:
        # Create services
        monitoring_service = MonitoringService(db)
        change_detection_service = ChangeDetectionService(db)
        alert_service = AlertService(db)
        
        # Check page and create snapshot
        snapshot = await monitoring_service.check_page(monitored_page, scraper)
        
        if not snapshot:
            return {"success": False, "error": "Failed to create snapshot"}
        
        result = {
            "success": True,
            "page_id": monitored_page.id,
            "snapshot_id": snapshot.id,
            "snapshot_success": snapshot.success,
        }
        
        # Analyze changes
        if snapshot.success:
            change_event = await change_detection_service.detect_and_analyze_changes(
                snapshot, monitored_page
            )
            
            if change_event:
                result["change_event_id"] = change_event.id
                result["change_detected"] = change_event.change_detected
                result["severity"] = change_event.severity
                
                # Send alerts if needed
                if change_event.change_detected and change_event.severity in [Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]:
                    await alert_service.send_alerts_for_change(change_event, monitored_page)
                    result["alerts_sent"] = True
                    
                    # Send email and webhook notifications
                    await _send_notifications(change_event, monitored_page, db)
                
                # Log activity
                _log_activity(change_event, monitored_page, db)
        
        return result


async def _send_notifications(change_event: ChangeEvent, monitored_page: MonitoredPage, db):
    """Send email and webhook notifications for a change event"""
    try:
        # Get all users in the organization
        from app.models.user import User
        users = db.query(User).filter(
            User.organization_id == monitored_page.competitor.organization_id
        ).all()
        
        for user in users:
            # Get user's notification preferences
            prefs = db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user.id
            ).first()
            
            if not prefs:
                continue
            
            # Check if user wants notifications for this severity
            should_notify = False
            if change_event.severity == Severity.CRITICAL and prefs.critical_changes:
                should_notify = True
            elif change_event.severity == Severity.HIGH and prefs.high_changes:
                should_notify = True
            elif change_event.severity == Severity.MEDIUM and prefs.medium_changes:
                should_notify = True
            elif change_event.severity == Severity.LOW and prefs.low_changes:
                should_notify = True
            
            if not should_notify:
                continue
            
            # Send email notification
            if prefs.email_enabled:
                try:
                    email_service.send_change_alert(
                        user=user,
                        change_event=change_event,
                        monitored_page_url=monitored_page.url,
                        competitor_name=monitored_page.competitor.name
                    )
                except Exception as e:
                    logger.error(f"Failed to send email to {user.email}: {e}")
            
            # Send webhook notification
            if prefs.webhook_enabled and prefs.webhook_url:
                try:
                    webhook_service.send_change_webhook(
                        webhook_url=prefs.webhook_url,
                        change_event=change_event,
                        monitored_page_url=monitored_page.url,
                        competitor_name=monitored_page.competitor.name
                    )
                except Exception as e:
                    logger.error(f"Failed to send webhook to {prefs.webhook_url}: {e}")
    
    except Exception as e:
        logger.error(f"Error in _send_notifications: {e}")


def _log_activity(change_event: ChangeEvent, monitored_page: MonitoredPage, db):
    """Log activity for the change detection"""
    try:
        if change_event.change_detected:
            activity = ActivityLog(
                organization_id=monitored_page.competitor.organization_id,
                user_id=None,  # System action
                action_type="change_detected",
                description=f"{change_event.severity.value.upper()} change detected on {monitored_page.competitor.name}",
                entity_type="change_event",
                entity_id=change_event.id,
                extra_data={
                    "competitor_name": monitored_page.competitor.name,
                    "page_url": monitored_page.url,
                    "severity": change_event.severity.value,
                    "change_type": change_event.change_type.value,
                }
            )
            db.add(activity)
            db.commit()
    except Exception as e:
        logger.error(f"Error logging activity: {e}")


@celery_app.task(name="app.workers.tasks.check_all_monitored_pages")
def check_all_monitored_pages() -> dict:
    """
    Check all monitored pages that are due for checking
    
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        monitoring_service = MonitoringService(db)
        pages = monitoring_service.get_pages_to_check()
        
        logger.info(f"Task: Checking {len(pages)} monitored pages")
        
        # Queue individual tasks for each page
        for page in pages:
            check_monitored_page.delay(page.id)
        
        return {
            "success": True,
            "pages_queued": len(pages),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in check_all_monitored_pages task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.send_alert")
def send_alert(alert_id: int) -> dict:
    """
    Send a single alert
    
    Args:
        alert_id: Alert ID
        
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            return {"success": False, "error": "Alert not found"}
        
        logger.info(f"Task: Sending alert {alert_id} via {alert.channel}")
        
        # Run async sending
        result = asyncio.run(_send_alert_async(alert, db))
        
        return result
        
    except Exception as e:
        logger.error(f"Error in send_alert task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


async def _send_alert_async(alert: Alert, db) -> dict:
    """Helper function to send alert"""
    alert_service = AlertService(db)
    success = await alert_service.send_single_alert(alert)
    
    return {
        "success": success,
        "alert_id": alert.id,
        "channel": alert.channel,
        "status": alert.status
    }


@celery_app.task(name="app.workers.tasks.retry_failed_alerts")
def retry_failed_alerts() -> dict:
    """
    Retry failed alerts
    
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        now = datetime.utcnow()
        
        # Get alerts that need retry
        alerts = db.query(Alert).filter(
            Alert.status.in_([AlertStatus.FAILED, AlertStatus.RETRY]),
            Alert.retry_count < Alert.max_retries,
            (Alert.next_retry_at.is_(None)) | (Alert.next_retry_at <= now)
        ).all()
        
        logger.info(f"Task: Retrying {len(alerts)} failed alerts")
        
        # Queue individual tasks
        for alert in alerts:
            send_alert.delay(alert.id)
        
        return {
            "success": True,
            "alerts_queued": len(alerts),
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in retry_failed_alerts task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.cleanup_old_snapshots")
def cleanup_old_snapshots(days_to_keep: int = 90) -> dict:
    """
    Clean up old snapshots
    
    Args:
        days_to_keep: Number of days to keep snapshots
        
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Count snapshots to delete
        count = db.query(Snapshot).filter(
            Snapshot.created_at < cutoff_date
        ).count()
        
        # Delete old snapshots
        db.query(Snapshot).filter(
            Snapshot.created_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Task: Cleaned up {count} old snapshots")
        
        return {
            "success": True,
            "deleted_count": count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in cleanup_old_snapshots task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.generate_weekly_summary")
def generate_weekly_summary(organization_id: int) -> dict:
    """
    Generate weekly summary report for an organization
    
    Args:
        organization_id: Organization ID
        
    Returns:
        Dictionary with task results
    """
    db = SessionLocal()
    
    try:
        from app.services.llm_service import LLMService
        from sqlalchemy import and_
        
        # Get changes from the last week
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        changes = db.query(ChangeEvent).join(
            MonitoredPage
        ).join(
            MonitoredPage.competitor
        ).filter(
            and_(
                ChangeEvent.created_at >= week_ago,
                ChangeEvent.change_detected == True,
                MonitoredPage.competitor.has(organization_id=organization_id)
            )
        ).all()
        
        if not changes:
            return {
                "success": True,
                "message": "No changes this week",
                "organization_id": organization_id
            }
        
        # Generate summary
        llm_service = LLMService()
        changes_data = [
            {
                "summary": c.summary,
                "severity": c.severity,
                "change_type": c.change_type
            }
            for c in changes
        ]
        
        summary = asyncio.run(
            llm_service.generate_summary_report(changes_data, "this week")
        )
        
        logger.info(f"Task: Generated weekly summary for org {organization_id}")
        
        return {
            "success": True,
            "organization_id": organization_id,
            "changes_count": len(changes),
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error in generate_weekly_summary task: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()
