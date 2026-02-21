"""
Hybrid change detection service: deterministic diff + Groq, with OpenAI
fallback for in-depth human-readable comparison, business impact, and
recommended actions when the hybrid path is insufficient.
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
from app.services.llm_service import LLMService
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _needs_openai_fallback(
    change_detected: bool,
    business_impact: str,
    recommended_action: str,
) -> bool:
    """Use OpenAI when a change was detected but impact/action are missing or too thin."""
    if not change_detected:
        return False
    impact_ok = (business_impact or "").strip()
    action_ok = (recommended_action or "").strip()
    return len(impact_ok) < 20 or len(action_ok) < 20


class ChangeDetectionService:
    """Service for detecting and analyzing changes"""
    
    def __init__(self, db: Session):
        self.db = db
        self.monitoring_service = MonitoringService(db)
        self.groq_engine = GroqEngine()
        self._llm_service: Optional[LLMService] = None

    def _get_llm_service(self) -> Optional[LLMService]:
        if getattr(settings, "OPENAI_API_KEY", None):
            if self._llm_service is None:
                self._llm_service = LLMService()
            return self._llm_service
        return None
    
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

        # Stage 5b: OpenAI fallback for in-depth analysis when hybrid/Groq didn't provide
        # enough business impact or recommended action (professional, reliable output).
        human_readable_comparison: Optional[str] = None
        if _needs_openai_fallback(change_detected, business_impact, recommended_action):
            llm = self._get_llm_service()
            if llm:
                try:
                    prev_text = previous_snapshot.cleaned_text or ""
                    curr_text = current_snapshot.cleaned_text or ""
                    in_depth = await llm.analyze_changes_in_depth(
                        previous_content=prev_text,
                        current_content=curr_text,
                        page_url=monitored_page.url or "",
                        page_title=getattr(monitored_page, "page_title", None) or current_snapshot.page_title,
                        page_type=getattr(monitored_page, "page_type", None),
                        initial_summary=summary,
                    )
                    human_readable_comparison = in_depth.get("human_readable_comparison") or ""
                    if in_depth.get("business_impact"):
                        business_impact = in_depth["business_impact"]
                    if in_depth.get("recommended_action"):
                        recommended_action = in_depth["recommended_action"]
                    if in_depth.get("summary"):
                        summary = in_depth["summary"]
                    if in_depth.get("severity"):
                        try:
                            severity = Severity(in_depth["severity"])
                            severity_score = {Severity.LOW: 1, Severity.MEDIUM: 2, Severity.HIGH: 3, Severity.CRITICAL: 4}.get(severity, 1)
                        except (ValueError, KeyError):
                            pass
                    if in_depth.get("change_type"):
                        try:
                            change_type = ChangeType(in_depth["change_type"])
                        except (ValueError, KeyError):
                            pass
                    logger.info("OpenAI in-depth analysis applied: human_readable_comparison and impact/action set")
                except Exception as e:
                    logger.warning("OpenAI in-depth analysis failed, using hybrid result: %s", e)
            else:
                logger.debug("OpenAI not configured; skipping in-depth analysis")
        
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
            ),
            human_readable_comparison=human_readable_comparison,
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
