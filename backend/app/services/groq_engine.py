"""
Stage 5 – Groq LLM engine.

Uses Groq's Llama 3 models to perform semantic analysis on reduced
structured fragments. Never sends full HTML, only:
- previous_structured_summary
- new_structured_summary
- changed text fragments (trimmed)
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from groq import Groq

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = (
  "You are a competitive intelligence analyst.\n"
  "Analyze website change fragments.\n"
  "Return only valid JSON.\n"
  "No markdown.\n"
  "No explanations.\n"
  "Do not hallucinate.\n"
  "Base conclusions only on provided content."
)


class GroqEngine:
  def __init__(self) -> None:
    if not settings.GROQ_API_KEY:
      logger.warning("GROQ_API_KEY not configured; GroqEngine will be disabled.")
      self.client = None
    else:
      self.client = Groq(api_key=settings.GROQ_API_KEY)

  def is_enabled(self) -> bool:
    return self.client is not None

  def analyze_changes(
    self,
    previous_structured_summary: Dict[str, Any],
    new_structured_summary: Dict[str, Any],
    changed_fragments: str,
  ) -> Optional[Dict[str, Any]]:
    """
    Call Groq LLM with reduced structured fragments and return JSON.
    """
    if not self.client:
      return None

    try:
      user_prompt = (
        "Previous structured summary:\n"
        f"{json.dumps(previous_structured_summary)[:800]}\n\n"
        "New structured summary:\n"
        f"{json.dumps(new_structured_summary)[:800]}\n\n"
        "Changed text blocks:\n"
        f"{changed_fragments[:800]}\n\n"
        "Return JSON only in the exact format specified."
      )

      completion = self.client.chat.completions.create(
        model=settings.GROQ_MODEL,
        temperature=settings.GROQ_TEMPERATURE,
        response_format={"type": "json_object"},
        messages=[
          {"role": "system", "content": SYSTEM_PROMPT},
          {"role": "user", "content": user_prompt},
        ],
      )

      content = completion.choices[0].message.content
      if not content:
        return None

      data = json.loads(content)

      # Basic validation & normalization
      result = {
        "change_detected": bool(data.get("change_detected", False)),
        "change_type": data.get("change_type", "other"),
        "severity": data.get("severity", "low"),
        "business_impact": data.get("business_impact", "") or "",
        "recommended_action": data.get("recommended_action", "") or "",
        "confidence": float(data.get("confidence", 0.0)),
      }
      return result
    except Exception as e:
      logger.error(f"GroqEngine analyze_changes failed: {e}")
      return None

