"""
Alert service for sending notifications via Slack and email
"""
import httpx
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import Alert, AlertChannel, AlertStatus
from app.models.change_event import ChangeEvent
from app.models.monitored_page import MonitoredPage
from app.models.competitor import Competitor
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AlertService:
    """Service for sending alerts via various channels"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def send_alerts_for_change(
        self,
        change_event: ChangeEvent,
        monitored_page: MonitoredPage
    ) -> dict:
        """
        Send alerts for a change event
        
        Args:
            change_event: ChangeEvent instance
            monitored_page: MonitoredPage instance
            
        Returns:
            Dictionary with alert sending results
        """
        results = {
            "slack": None,
            "email": None
        }
        
        # Get competitor info
        competitor = self.db.query(Competitor).filter(
            Competitor.id == monitored_page.competitor_id
        ).first()
        
        if not competitor:
            logger.error(f"Competitor not found for page {monitored_page.id}")
            return results
        
        # Prepare message content
        message_data = self._prepare_message(
            change_event,
            monitored_page,
            competitor
        )
        
        # Send Slack alert if configured
        if settings.SLACK_WEBHOOK_URL:
            slack_alert = await self._create_and_send_slack_alert(
                change_event,
                message_data
            )
            results["slack"] = slack_alert
        
        # Send email alert if configured
        if settings.SMTP_USER and competitor.organization.contact_email:
            email_alert = await self._create_and_send_email_alert(
                change_event,
                competitor.organization.contact_email,
                message_data
            )
            results["email"] = email_alert
        
        return results
    
    async def _create_and_send_slack_alert(
        self,
        change_event: ChangeEvent,
        message_data: dict
    ) -> Optional[Alert]:
        """Create and send a Slack alert"""
        
        # Create alert record
        alert = Alert(
            change_event_id=change_event.id,
            channel=AlertChannel.SLACK,
            status=AlertStatus.PENDING,
            message=message_data["slack_message"],
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        
        # Send alert
        success = await self.send_slack_alert(
            message_data["slack_message"],
            alert
        )
        
        return alert if success else None
    
    async def _create_and_send_email_alert(
        self,
        change_event: ChangeEvent,
        recipient: str,
        message_data: dict
    ) -> Optional[Alert]:
        """Create and send an email alert"""
        
        # Create alert record
        alert = Alert(
            change_event_id=change_event.id,
            channel=AlertChannel.EMAIL,
            recipient=recipient,
            subject=message_data["email_subject"],
            message=message_data["email_body"],
            status=AlertStatus.PENDING,
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        
        # Send alert
        success = await self.send_email_alert(
            recipient,
            message_data["email_subject"],
            message_data["email_body"],
            alert
        )
        
        return alert if success else None
    
    def _prepare_message(
        self,
        change_event: ChangeEvent,
        monitored_page: MonitoredPage,
        competitor: Competitor
    ) -> dict:
        """Prepare message content for alerts"""
        
        # Severity emoji
        severity_emoji_map = {
            "low": "ℹ️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔴"
        }
        emoji = severity_emoji_map.get(change_event.severity, "ℹ️")
        
        # Slack message format
        slack_message = f"""{emoji} *Change Detected*

*Company:* {competitor.name}
*Page:* {monitored_page.url}
*Severity:* {change_event.severity.upper()}
*Type:* {change_event.change_type}

*Summary:*
{change_event.summary}

*Business Impact:*
{change_event.business_impact}

*Recommended Action:*
{change_event.recommended_action}

_Detected at: {change_event.created_at.strftime('%Y-%m-%d %H:%M UTC')}_
"""
        
        # Email subject
        email_subject = f"[{change_event.severity.upper()}] Change Detected: {competitor.name} - {monitored_page.page_type or 'Page'}"
        
        # Email body (HTML)
        email_body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .header {{ background-color: #f4f4f4; padding: 20px; border-left: 4px solid #2196F3; }}
        .severity-{change_event.severity} {{ border-color: {"#ff4444" if change_event.severity in ["high", "critical"] else "#ffaa00" if change_event.severity == "medium" else "#2196F3"}; }}
        .content {{ padding: 20px; }}
        .field {{ margin-bottom: 15px; }}
        .field-label {{ font-weight: bold; color: #555; }}
        .field-value {{ margin-top: 5px; }}
        .footer {{ padding: 20px; background-color: #f4f4f4; font-size: 12px; color: #777; }}
    </style>
</head>
<body>
    <div class="header severity-{change_event.severity}">
        <h2>{emoji} Change Detected on Competitor Website</h2>
    </div>
    
    <div class="content">
        <div class="field">
            <div class="field-label">Company:</div>
            <div class="field-value">{competitor.name}</div>
        </div>
        
        <div class="field">
            <div class="field-label">Page URL:</div>
            <div class="field-value"><a href="{monitored_page.url}">{monitored_page.url}</a></div>
        </div>
        
        <div class="field">
            <div class="field-label">Severity:</div>
            <div class="field-value" style="color: {"#ff4444" if change_event.severity in ["high", "critical"] else "#ffaa00" if change_event.severity == "medium" else "#2196F3"};">
                {change_event.severity.upper()}
            </div>
        </div>
        
        <div class="field">
            <div class="field-label">Change Type:</div>
            <div class="field-value">{change_event.change_type}</div>
        </div>
        
        <div class="field">
            <div class="field-label">Summary:</div>
            <div class="field-value">{change_event.summary}</div>
        </div>
        
        <div class="field">
            <div class="field-label">Business Impact:</div>
            <div class="field-value">{change_event.business_impact}</div>
        </div>
        
        <div class="field">
            <div class="field-label">Recommended Action:</div>
            <div class="field-value">{change_event.recommended_action}</div>
        </div>
    </div>
    
    <div class="footer">
        <p>Detected at: {change_event.created_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
        <p>This alert was sent by ChangeSignal AI</p>
    </div>
</body>
</html>
"""
        
        return {
            "slack_message": slack_message,
            "email_subject": email_subject,
            "email_body": email_body
        }
    
    async def send_slack_alert(
        self,
        message: str,
        alert: Alert
    ) -> bool:
        """
        Send a Slack webhook notification
        
        Args:
            message: Message to send
            alert: Alert instance to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    settings.SLACK_WEBHOOK_URL,
                    json={"text": message},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    alert.status = AlertStatus.SENT
                    alert.sent_at = datetime.utcnow()
                    alert.response_data = {"status_code": response.status_code}
                    self.db.commit()
                    
                    logger.info(f"Slack alert sent successfully: {alert.id}")
                    return True
                else:
                    raise Exception(f"Slack API returned status {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error sending Slack alert {alert.id}: {e}")
            alert.status = AlertStatus.FAILED
            alert.error_message = str(e)
            alert.retry_count += 1
            
            if alert.retry_count < alert.max_retries:
                alert.status = AlertStatus.RETRY
                alert.next_retry_at = datetime.utcnow() + timedelta(minutes=5 * alert.retry_count)
            
            self.db.commit()
            return False
    
    async def send_email_alert(
        self,
        recipient: str,
        subject: str,
        body: str,
        alert: Alert
    ) -> bool:
        """
        Send an email notification
        
        Args:
            recipient: Email recipient
            subject: Email subject
            body: Email body (HTML)
            alert: Alert instance to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = settings.SMTP_FROM
            message["To"] = recipient
            message["Subject"] = subject
            
            # Attach HTML body
            html_part = MIMEText(body, "html")
            message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=settings.SMTP_TLS,
                timeout=30
            )
            
            alert.status = AlertStatus.SENT
            alert.sent_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Email alert sent successfully: {alert.id} to {recipient}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email alert {alert.id}: {e}")
            alert.status = AlertStatus.FAILED
            alert.error_message = str(e)
            alert.retry_count += 1
            
            if alert.retry_count < alert.max_retries:
                alert.status = AlertStatus.RETRY
                alert.next_retry_at = datetime.utcnow() + timedelta(minutes=5 * alert.retry_count)
            
            self.db.commit()
            return False
    
    async def send_single_alert(self, alert: Alert) -> bool:
        """
        Send a single alert (for retry mechanism)
        
        Args:
            alert: Alert instance
            
        Returns:
            True if successful, False otherwise
        """
        if alert.channel == AlertChannel.SLACK:
            return await self.send_slack_alert(alert.message, alert)
        elif alert.channel == AlertChannel.EMAIL:
            return await self.send_email_alert(
                alert.recipient,
                alert.subject,
                alert.message,
                alert
            )
        else:
            logger.warning(f"Unknown alert channel: {alert.channel}")
            return False
