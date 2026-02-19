"""
Stage 4 – Confidence router.

Decides whether to call the Groq LLM based on:
- presence/absence of structured pricing changes
- text difference ratio
- deterministic confidence
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import difflib


@dataclass
class RouterConfig:
  """Thresholds for routing to LLM."""

  diff_ratio_threshold: float = 0.30  # >30% content difference
  confidence_threshold: float = 0.70  # below this, use LLM


@dataclass
class RouterDecision:
  requires_llm: bool
  reason: str


def _content_diff_ratio(prev_text: str, curr_text: str) -> float:
  if not prev_text or not curr_text:
    return 1.0 if prev_text != curr_text else 0.0
  matcher = difflib.SequenceMatcher(None, prev_text, curr_text)
  similarity = matcher.ratio()
  return 1.0 - similarity


def decide_llm_required(
  prev_structured: Dict[str, Any],
  curr_structured: Dict[str, Any],
  prev_text: str,
  curr_text: str,
  deterministic_confidence: float,
  config: Optional[RouterConfig] = None,
) -> RouterDecision:
  cfg = config or RouterConfig()

  pricing_changes = (
    (prev_structured.get("pricing") or []) or (curr_structured.get("pricing") or [])
  )
  has_structured_pricing = bool(pricing_changes)

  ratio = _content_diff_ratio(prev_text or "", curr_text or "")

  # Case 1: No structured pricing but large text diff
  if not has_structured_pricing and ratio > cfg.diff_ratio_threshold:
    return RouterDecision(
      requires_llm=True,
      reason=f"large_text_diff_no_pricing (ratio={ratio:.2f})",
    )

  # Case 2: deterministic confidence too low
  if deterministic_confidence < cfg.confidence_threshold:
    return RouterDecision(
      requires_llm=True,
      reason=f"low_confidence ({deterministic_confidence:.2f})",
    )

  # TODO: heading semantic shift can be added here if needed

  return RouterDecision(requires_llm=False, reason="deterministic_confident")

