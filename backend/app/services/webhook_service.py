"""
Webhook service for sending change notifications to external systems
"""
import requests
import json
from typing import Dict, Any
from app.models.change_event import ChangeEvent


class WebhookService:
    """Service for sending webhook notifications"""
    
    def send_change_webhook(
        self,
        webhook_url: str,
        change_event: ChangeEvent,
        monitored_page_url: str,
        competitor_name: str
    ):
        """Send a webhook notification for a detected change"""
        if not webhook_url:
            return
        
        payload = self._build_payload(change_event, monitored_page_url, competitor_name)
        
        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response.raise_for_status()
            print(f"✅ Webhook sent successfully to {webhook_url}")
        except Exception as e:
            print(f"❌ Failed to send webhook to {webhook_url}: {str(e)}")
    
    def _build_payload(
        self,
        change_event: ChangeEvent,
        page_url: str,
        competitor_name: str
    ) -> Dict[str, Any]:
        """Build webhook payload"""
        return {
            "event_type": "change_detected",
            "timestamp": change_event.created_at.isoformat() if change_event.created_at else None,
            "change": {
                "id": change_event.id,
                "severity": change_event.severity.value,
                "change_type": change_event.change_type.value,
                "summary": change_event.summary,
                "business_impact": change_event.business_impact,
                "recommended_action": change_event.recommended_action,
            },
            "competitor": {
                "name": competitor_name,
                "page_url": page_url,
            },
            "metadata": {
                "platform": "ChangeSignal AI",
                "version": "1.0"
            }
        }


# Singleton instance
webhook_service = WebhookService()
