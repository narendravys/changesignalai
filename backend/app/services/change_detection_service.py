"""
Hybrid change detection service that combines deterministic diffing and
optional Groq LLM analysis.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.snapshot import Snapshot
from app.models.change_event import ChangeEvent, ChangeType, Severity
from app.models.monitored_page import MonitoredPage
from app.services.monitoring_service import MonitoringService
from app.services.extractor import extract_structured
from app.services.diff_engine import diff_structured
from app.services.router import decide_llm_required
from app.services.groq_engine import GroqEngine
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ChangeDetectionService:
    """Service for detecting and analyzing changes"""
    
    def __init__(self, db: Session):
        self.db = db
        self.monitoring_service = MonitoringService(db)
        self.groq_engine = GroqEngine()
    
    async def detect_and_analyze_changes(
        self,
        current_snapshot: Snapshot,
        monitored_page: MonitoredPage
    ) -> Optional[ChangeEvent]:
        """
        Detect and analyze changes between snapshots
        
        Args:
            current_snapshot: Current snapshot
            monitored_page: MonitoredPage instance
            
        Returns:
            ChangeEvent if changes detected, None otherwise
        """
        # Check if current snapshot is successful
        if not current_snapshot.success or not current_snapshot.cleaned_text:
            logger.warning(f"Snapshot {current_snapshot.id} failed or has no content")
            return None
        
        # Get previous snapshot
        previous_snapshot = self.monitoring_service.get_previous_snapshot(
            monitored_page.id,
            before_snapshot_id=current_snapshot.id
        )
        
        # If no previous snapshot, this is the first check
        if not previous_snapshot:
            logger.info(f"No previous snapshot for page {monitored_page.id}, skipping comparison")
            return None
        
        # Quick check: compare content hashes
        if current_snapshot.content_hash == previous_snapshot.content_hash:
            logger.info(f"Content hash unchanged for page {monitored_page.id}")
            
            change_event = ChangeEvent(
                monitored_page_id=monitored_page.id,
                snapshot_id=current_snapshot.id,
                change_detected=False,
                summary="No changes detected",
                change_type=ChangeType.OTHER,
                severity=Severity.LOW,
                severity_score=1,
                structured_diff={},
                requires_llm=False,
                confidence=0.9,
            )
            self.db.add(change_event)
            self.db.commit()
            self.db.refresh(change_event)
            return change_event
        
        logger.info(f"Content changed for page {monitored_page.id}, running hybrid engine...")
        
        # Stage 2: deterministic extraction
        prev_structured = extract_structured(previous_snapshot.raw_html or previous_snapshot.cleaned_text or "")
        curr_structured = extract_structured(current_snapshot.raw_html or current_snapshot.cleaned_text or "")
        
        # Stage 3: deterministic diff
        diff_result = diff_structured(prev_structured.to_dict(), curr_structured.to_dict())
        
        # Stage 4: router decision
        router_decision = decide_llm_required(
            prev_structured.to_dict(),
            curr_structured.to_dict(),
            previous_snapshot.cleaned_text or "",
            current_snapshot.cleaned_text or "",
            diff_result.confidence,
        )
        
        requires_llm = router_decision.requires_llm and self.groq_engine.is_enabled()
        llm_analysis: Optional[Dict[str, Any]] = None
        
        # Stage 5: Groq semantic analysis (only if required)
        if requires_llm:
            llm_analysis = self.groq_engine.analyze_changes(
                previous_structured_summary=prev_structured.to_dict(),
                new_structured_summary=curr_structured.to_dict(),
                changed_fragments=self._generate_diff_preview(
                    previous_snapshot.cleaned_text or "",
                    current_snapshot.cleaned_text or "",
                    max_length=800,
                ),
            )
        
        # Merge deterministic + LLM results
        change_detected = diff_result.change_detected
        change_type = ChangeType.OTHER
        severity = diff_result.severity
        severity_score = 1
        summary = "Change detected"
        business_impact = ""
        recommended_action = ""
        confidence = diff_result.confidence
        
        if llm_analysis:
            change_detected = llm_analysis.get("change_detected", change_detected)
            summary = llm_analysis.get("summary", summary) or summary
            change_type = ChangeType(llm_analysis.get("change_type", "other"))
            severity = Severity(llm_analysis.get("severity", severity.value))
            business_impact = llm_analysis.get("business_impact", "") or ""
            recommended_action = llm_analysis.get("recommended_action", "") or ""
            confidence = llm_analysis.get("confidence", confidence)
            severity_score = {
                Severity.LOW: 1,
                Severity.MEDIUM: 2,
                Severity.HIGH: 3,
                Severity.CRITICAL: 4,
            }.get(severity, 1)
        else:
            # Purely deterministic path
            change_type = (
                ChangeType.PRICING
                if diff_result.structured_changes.get("pricing_changes")
                else ChangeType.OTHER
            )
            severity = diff_result.severity
            confidence = diff_result.confidence
            severity_score = {
                Severity.LOW: 1,
                Severity.MEDIUM: 2,
                Severity.HIGH: 3,
                Severity.CRITICAL: 4,
            }.get(severity, 1)
            # Simple summary
            if diff_result.structured_changes.get("pricing_changes"):
                summary = "Pricing changes detected"
            elif diff_result.structured_changes.get("new_plans") or diff_result.structured_changes.get("removed_plans"):
                summary = "Plan changes detected"
            elif diff_result.structured_changes.get("feature_changes"):
                summary = "Feature changes detected"
            elif diff_result.structured_changes.get("heading_changes"):
                summary = "Heading changes detected"
            else:
                summary = "Content changes detected"
        
        # Stage 6: create change event
        change_event = ChangeEvent(
            monitored_page_id=monitored_page.id,
            snapshot_id=current_snapshot.id,
            change_detected=change_detected,
            summary=summary,
            change_type=change_type,
            severity=severity,
            severity_score=severity_score,
            business_impact=business_impact,
            recommended_action=recommended_action,
            structured_diff=diff_result.structured_changes,
            llm_analysis=llm_analysis,
            requires_llm=requires_llm,
            confidence=confidence,
            diff_preview=self._generate_diff_preview(
                previous_snapshot.cleaned_text or "",
                current_snapshot.cleaned_text or ""
            )
        )
        
        try:
            self.db.add(change_event)
            self.db.commit()
            self.db.refresh(change_event)
            
            logger.info(
                f"Change event created: ID={change_event.id}, "
                f"detected={change_event.change_detected}, "
                f"severity={change_event.severity}"
            )
            
            return change_event
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating change event: {e}")
            return None
    
    def _generate_diff_preview(
        self,
        previous_content: str,
        current_content: str,
        max_length: int = 500
    ) -> str:
        """
        Generate a simple diff preview
        
        Args:
            previous_content: Previous content
            current_content: Current content
            max_length: Maximum length of preview
            
        Returns:
            Diff preview string
        """
        # Simple approach: show first few characters of each
        prev_preview = previous_content[:max_length] if previous_content else ""
        curr_preview = current_content[:max_length] if current_content else ""
        
        if len(previous_content) > max_length:
            prev_preview += "..."
        if len(current_content) > max_length:
            curr_preview += "..."
        
        return f"BEFORE:\n{prev_preview}\n\nAFTER:\n{curr_preview}"
