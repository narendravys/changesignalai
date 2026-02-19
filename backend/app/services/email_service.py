"""
Email notification service for sending change alerts
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from app.models.change_event import ChangeEvent, Severity
from app.models.user import User


class EmailService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@changesignal.ai")
        self.enabled = bool(self.smtp_user and self.smtp_password)
    
    def send_change_alert(self, user: User, change_event: ChangeEvent, monitored_page_url: str, competitor_name: str):
        """Send an email alert for a detected change"""
        if not self.enabled:
            print(f"Email not configured, skipping notification for user {user.email}")
            return
        
        subject = self._get_subject(change_event, competitor_name)
        html_body = self._get_html_body(change_event, monitored_page_url, competitor_name)
        
        self._send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body
        )
    
    def send_digest(self, user: User, changes: List[Dict[str, Any]], period: str = "daily"):
        """Send a digest email with multiple changes"""
        if not self.enabled or not changes:
            return
        
        subject = f"ChangeSignal AI - Your {period.capitalize()} Competitor Intelligence Digest"
        html_body = self._get_digest_html(changes, period)
        
        self._send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body
        )
    
    def _get_subject(self, change_event: ChangeEvent, competitor_name: str) -> str:
        """Generate email subject based on severity"""
        severity_emoji = {
            Severity.CRITICAL: "🚨",
            Severity.HIGH: "⚠️",
            Severity.MEDIUM: "📊",
            Severity.LOW: "ℹ️"
        }
        
        emoji = severity_emoji.get(change_event.severity, "ℹ️")
        return f"{emoji} {change_event.severity.value.upper()}: {competitor_name} - {change_event.change_type.value.title()} Change Detected"
    
    def _get_html_body(self, change_event: ChangeEvent, page_url: str, competitor_name: str) -> str:
        """Generate HTML email body"""
        severity_colors = {
            Severity.CRITICAL: "#DC2626",
            Severity.HIGH: "#EA580C",
            Severity.MEDIUM: "#CA8A04",
            Severity.LOW: "#2563EB"
        }
        
        color = severity_colors.get(change_event.severity, "#2563EB")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⚡ ChangeSignal AI</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Competitor Intelligence Alert</p>
                </div>
                
                <!-- Alert Badge -->
                <div style="background-color: white; padding: 20px; border-left: 4px solid {color};">
                    <div style="display: inline-block; background-color: {color}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                        {change_event.severity.value} - {change_event.change_type.value}
                    </div>
                </div>
                
                <!-- Main Content -->
                <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="margin: 0 0 15px 0; color: #1F2937; font-size: 20px;">🎯 Change Detected</h2>
                    
                    <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;"><strong>Competitor:</strong></p>
                        <p style="margin: 0; color: #1F2937; font-size: 16px; font-weight: 600;">{competitor_name}</p>
                    </div>
                    
                    <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;"><strong>Summary:</strong></p>
                        <p style="margin: 0; color: #1F2937; font-size: 14px; line-height: 1.6;">{change_event.summary or "Change detected on monitored page"}</p>
                    </div>
                    
                    {self._format_business_impact(change_event.business_impact) if change_event.business_impact else ""}
                    
                    {self._format_recommended_action(change_event.recommended_action) if change_event.recommended_action else ""}
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="{page_url}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Competitor Page →
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6B7280; font-size: 12px;">
                    <p style="margin: 0 0 10px 0;">This alert was sent by ChangeSignal AI</p>
                    <p style="margin: 0;">Stay ahead of your competition with real-time intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _format_business_impact(self, impact: str) -> str:
        """Format business impact section"""
        return f"""
        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
            <p style="margin: 0 0 10px 0; color: #92400E; font-size: 14px; font-weight: 600;">📊 Business Impact:</p>
            <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">{impact}</p>
        </div>
        """
    
    def _format_recommended_action(self, action: str) -> str:
        """Format recommended action section"""
        return f"""
        <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
            <p style="margin: 0 0 10px 0; color: #1E40AF; font-size: 14px; font-weight: 600;">💡 Recommended Action:</p>
            <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.6;">{action}</p>
        </div>
        """
    
    def _get_digest_html(self, changes: List[Dict[str, Any]], period: str) -> str:
        """Generate digest email HTML"""
        changes_html = ""
        for change in changes[:10]:  # Limit to 10 changes
            changes_html += f"""
            <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3B82F6;">
                <p style="margin: 0 0 5px 0; font-weight: 600; color: #1F2937;">{change['competitor_name']}</p>
                <p style="margin: 0 0 5px 0; font-size: 14px; color: #6B7280;">{change['summary'][:150]}...</p>
                <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                    <span style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; margin-right: 5px;">{change['severity'].upper()}</span>
                    {change['change_type'].title()}
                </p>
            </div>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📊 Your {period.title()} Digest</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">{len(changes)} changes detected</p>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="margin: 0 0 20px 0; color: #1F2937;">Recent Changes:</h2>
                    {changes_html}
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="http://localhost:3000/changes" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            View All Changes →
                        </a>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6B7280; font-size: 12px;">
                    <p style="margin: 0;">ChangeSignal AI - Competitive Intelligence Platform</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _send_email(self, to_email: str, subject: str, html_body: str):
        """Send email via SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"✅ Email sent successfully to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {str(e)}")


# Singleton instance
email_service = EmailService()
