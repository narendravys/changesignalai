"""
LLM service for analyzing changes using OpenAI
"""
import json
import re
from typing import Dict, Any, Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.change_event import ChangeType, Severity
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LLMService:
    """Service for LLM-based change analysis"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
    
    async def analyze_changes(
        self,
        previous_content: str,
        current_content: str,
        page_url: str,
        page_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze changes between two snapshots using LLM
        
        Args:
            previous_content: Previous snapshot content
            current_content: Current snapshot content
            page_url: URL of the page
            page_type: Optional page type (pricing, features, etc.)
            
        Returns:
            Dictionary with analysis results:
                - change_detected: bool
                - summary: str
                - change_type: str
                - severity: str
                - business_impact: str
                - recommended_action: str
        """
        try:
            # Truncate content if too long (to fit in context window)
            max_content_length = 8000
            previous_truncated = self._truncate_content(previous_content, max_content_length)
            current_truncated = self._truncate_content(current_content, max_content_length)
            
            # Build prompt
            prompt = self._build_analysis_prompt(
                previous_truncated,
                current_truncated,
                page_url,
                page_type
            )
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert business analyst specializing in competitive intelligence. Your task is to analyze changes on competitor websites and assess their business impact."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )
            
            # Parse response
            result = json.loads(response.choices[0].message.content)
            
            # Validate and normalize response
            normalized_result = self._normalize_response(result)
            
            logger.info(f"LLM analysis complete: change_detected={normalized_result['change_detected']}, severity={normalized_result['severity']}")
            
            return normalized_result
            
        except Exception as e:
            logger.error(f"Error in LLM analysis: {e}")
            # Return default response on error
            return {
                "change_detected": False,
                "summary": f"Error analyzing changes: {str(e)}",
                "change_type": "other",
                "severity": "low",
                "business_impact": "Unable to analyze due to error",
                "recommended_action": "Review manually"
            }
    
    def _build_analysis_prompt(
        self,
        previous_content: str,
        current_content: str,
        page_url: str,
        page_type: Optional[str] = None
    ) -> str:
        """Build the analysis prompt for the LLM"""
        
        page_type_context = f"\nPage Type: {page_type}" if page_type else ""
        
        prompt = f"""Analyze the changes between two versions of a competitor's web page and provide a detailed assessment.

URL: {page_url}{page_type_context}

PREVIOUS VERSION:
{previous_content}

CURRENT VERSION:
{current_content}

Your task is to:
1. Determine if there are any meaningful changes (ignore minor formatting/whitespace)
2. Classify the type of change
3. Assess the severity and business impact
4. Recommend actions to take

Respond ONLY with valid JSON in this exact format:
{{
    "change_detected": true or false,
    "summary": "Brief 1-2 sentence summary of what changed",
    "change_type": "pricing|features|policy|content|layout|other",
    "severity": "low|medium|high|critical",
    "business_impact": "Detailed explanation of how this change affects our business",
    "recommended_action": "Specific action we should take in response"
}}

Guidelines for severity:
- low: Minor content updates, cosmetic changes
- medium: Feature updates, content additions/removals
- high: Pricing changes, new major features, policy updates
- critical: Major pricing drops, legal/compliance changes, competitive threats

Be objective and focus on business implications. If no meaningful changes detected, set change_detected to false."""
        
        return prompt
    
    def _truncate_content(self, content: str, max_length: int) -> str:
        """Truncate content to fit within token limits"""
        if len(content) <= max_length:
            return content
        
        # Truncate and add marker
        truncated = content[:max_length]
        return truncated + "\n\n[... content truncated ...]"
    
    def _normalize_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate LLM response"""
        
        # Ensure all required fields exist
        normalized = {
            "change_detected": bool(response.get("change_detected", False)),
            "summary": str(response.get("summary", "No summary provided")),
            "change_type": response.get("change_type", "other"),
            "severity": response.get("severity", "low"),
            "business_impact": str(response.get("business_impact", "")),
            "recommended_action": str(response.get("recommended_action", ""))
        }
        
        # Validate change_type
        valid_types = ["pricing", "features", "policy", "content", "layout", "other"]
        if normalized["change_type"] not in valid_types:
            normalized["change_type"] = "other"
        
        # Validate severity
        valid_severities = ["low", "medium", "high", "critical"]
        if normalized["severity"] not in valid_severities:
            normalized["severity"] = "low"
        
        return normalized
    
    def apply_rule_based_overrides(
        self,
        analysis: Dict[str, Any],
        previous_content: str,
        current_content: str,
        page_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Apply rule-based overrides to LLM analysis
        
        This implements the business logic from the spec:
        - If price numbers change → at least medium
        - If % change > 10% → high
        - If "Terms", "Compliance", "Legal" page changes → high
        """
        
        # Price detection
        if self._detect_price_changes(previous_content, current_content):
            if analysis["severity"] == "low":
                analysis["severity"] = "medium"
                analysis["business_impact"] += " [Auto-elevated: Price changes detected]"
                logger.info("Severity elevated to medium due to price changes")
        
        # Large percentage changes
        percentage_change = self._detect_percentage_changes(previous_content, current_content)
        if percentage_change and percentage_change > 10:
            if analysis["severity"] in ["low", "medium"]:
                analysis["severity"] = "high"
                analysis["business_impact"] += f" [Auto-elevated: {percentage_change}% change detected]"
                logger.info(f"Severity elevated to high due to {percentage_change}% change")
        
        # Legal/compliance pages
        if page_type and page_type.lower() in ["terms", "compliance", "legal", "privacy", "policy"]:
            if analysis["change_detected"] and analysis["severity"] != "critical":
                analysis["severity"] = "high"
                analysis["business_impact"] += " [Auto-elevated: Legal/compliance page change]"
                logger.info("Severity elevated to high due to legal page change")
        
        # Set severity_score (1-4)
        severity_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        analysis["severity_score"] = severity_map.get(analysis["severity"], 1)
        
        return analysis
    
    def _detect_price_changes(self, previous: str, current: str) -> bool:
        """Detect if price numbers have changed"""
        # Pattern to match prices: $X, $X.XX, €X, £X, etc.
        price_pattern = r'[$€£¥]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*[$€£¥]'
        
        prev_prices = set(re.findall(price_pattern, previous))
        curr_prices = set(re.findall(price_pattern, current))
        
        # Check if prices are different
        return prev_prices != curr_prices and len(prev_prices) > 0 and len(curr_prices) > 0
    
    def _detect_percentage_changes(self, previous: str, current: str) -> Optional[float]:
        """Detect percentage changes in content"""
        # Pattern to match percentages: X%, X.X%
        percent_pattern = r'\d+(?:\.\d+)?\s*%'
        
        prev_percentages = [float(p.replace('%', '').strip()) for p in re.findall(percent_pattern, previous)]
        curr_percentages = [float(p.replace('%', '').strip()) for p in re.findall(percent_pattern, current)]
        
        # If we have percentages in both versions, check for significant changes
        if prev_percentages and curr_percentages:
            # Find the largest change
            max_change = 0
            for curr in curr_percentages:
                for prev in prev_percentages:
                    change = abs(curr - prev)
                    if change > max_change:
                        max_change = change
            return max_change if max_change > 0 else None
        
        return None
    
    async def generate_summary_report(
        self,
        changes: list[Dict[str, Any]],
        time_period: str = "this week"
    ) -> str:
        """
        Generate a summary report of multiple changes
        
        Args:
            changes: List of change event dictionaries
            time_period: Description of time period
            
        Returns:
            Formatted summary report
        """
        try:
            changes_summary = "\n".join([
                f"- {c.get('summary', 'No summary')} (Severity: {c.get('severity', 'unknown')})"
                for c in changes[:20]  # Limit to 20 changes
            ])
            
            prompt = f"""Generate a concise executive summary of the following competitor changes from {time_period}:

{changes_summary}

Provide:
1. Overall trends and patterns
2. Most significant changes
3. Strategic recommendations

Keep it brief (3-4 paragraphs) and actionable."""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a strategic business analyst."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating summary report: {e}")
            return f"Error generating report: {str(e)}"
