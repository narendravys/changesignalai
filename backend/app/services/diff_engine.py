"""
Stage 3 – Deterministic diff engine.

Compares two structured extraction results (from extractor.py) and emits:
- whether change was detected
- structured list of changes
- severity and numeric severity_score
- base confidence score
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

from app.models.change_event import Severity


@dataclass
class DiffResult:
  change_detected: bool
  requires_llm: bool
  confidence: float
  structured_changes: Dict[str, Any]
  severity: Severity

  def to_dict(self) -> Dict[str, Any]:
    return {
      "change_detected": self.change_detected,
      "requires_llm": self.requires_llm,
      "confidence": self.confidence,
      "structured_changes": self.structured_changes,
      "severity": self.severity.value,
    }


def _normalize_price(p: str) -> Optional[float]:
  try:
    cleaned = p.replace(",", "").replace("$", "").strip()
    return float(cleaned)
  except Exception:
    return None


def _index_pricing(pricing: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
  """
  Index pricing signals by a simple context key to compare old/new.
  """
  index: Dict[str, Dict[str, Any]] = {}
  for item in pricing:
    ctx = item.get("context", "")[:100]
    key = ctx.lower()
    if key not in index:
      index[key] = item
  return index


def diff_structured(
  prev: Dict[str, Any],
  curr: Dict[str, Any],
) -> DiffResult:
  """
  Compute deterministic diff between previous and current structured snapshots.
  Applies rule-based severity and base confidence.
  """
  changes: Dict[str, Any] = {
    "pricing_changes": [],
    "new_plans": [],
    "removed_plans": [],
    "heading_changes": [],
    "feature_changes": [],
    "table_changes": [],
  }

  severity = Severity.LOW
  confidence = 0.8
  change_detected = False

  # --- Pricing diff ---
  prev_pricing = prev.get("pricing") or []
  curr_pricing = curr.get("pricing") or []
  prev_index = _index_pricing(prev_pricing)
  curr_index = _index_pricing(curr_pricing)

  # Detect price changes where context matches
  for key, prev_item in prev_index.items():
    curr_item = curr_index.get(key)
    if not curr_item:
      # Removed pricing block
      changes["removed_plans"].append({"previous": prev_item})
      change_detected = True
      continue

    prev_price = _normalize_price(prev_item.get("raw", ""))
    curr_price = _normalize_price(curr_item.get("raw", ""))
    if prev_price is not None and curr_price is not None and prev_price > 0:
      delta = curr_price - prev_price
      pct = delta / prev_price
      if abs(pct) > 0.001:
        price_change = {
          "previous": prev_item,
          "current": curr_item,
          "delta": delta,
          "percent_change": pct,
        }
        changes["pricing_changes"].append(price_change)
        change_detected = True
        # Significant price increase
        if pct > 0.10 and severity.value in [Severity.LOW.value, Severity.MEDIUM.value]:
          severity = Severity.HIGH
          confidence = max(confidence, 0.9)

  # New plans (pricing context not seen before)
  for key, curr_item in curr_index.items():
    if key not in prev_index:
      changes["new_plans"].append({"current": curr_item})
      change_detected = True
      if severity == Severity.LOW:
        severity = Severity.MEDIUM

  # --- Headings diff ---
  prev_headings = prev.get("headings") or []
  curr_headings = curr.get("headings") or []
  prev_head_texts = [h["text"] for h in prev_headings]
  curr_head_texts = [h["text"] for h in curr_headings]

  if prev_head_texts != curr_head_texts:
    changes["heading_changes"] = {
      "previous": prev_head_texts,
      "current": curr_head_texts,
    }
    change_detected = True

  # --- Features diff (simple set-based) ---
  prev_features_flat = {item for block in (prev.get("features") or []) for item in block}
  curr_features_flat = {item for block in (curr.get("features") or []) for item in block}

  added_features = sorted(curr_features_flat - prev_features_flat)
  removed_features = sorted(prev_features_flat - curr_features_flat)
  if added_features or removed_features:
    changes["feature_changes"] = {
      "added": added_features,
      "removed": removed_features,
    }
    change_detected = True

  # --- Table diff (coarse) ---
  prev_tables = prev.get("tables") or []
  curr_tables = curr.get("tables") or []
  if prev_tables != curr_tables:
    changes["table_changes"] = {
      "previous_count": len(prev_tables),
      "current_count": len(curr_tables),
    }
    change_detected = True

  # If we didn't see any strong signals, keep low severity and moderate confidence
  if not change_detected:
    confidence = 0.6

  # Heuristic: if we saw only minor heading or feature changes, keep severity low
  if (
    changes["pricing_changes"] == []
    and changes["new_plans"] == []
    and changes["removed_plans"] == []
    and (changes["heading_changes"] or changes["feature_changes"])
  ):
    severity = Severity.LOW
    confidence = max(confidence, 0.75)

  return DiffResult(
    change_detected=change_detected,
    requires_llm=False,  # router will decide
    confidence=confidence,
    structured_changes=changes,
    severity=severity,
  )

