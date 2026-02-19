"""
Stage 2 – Deterministic extraction layer.

Uses BeautifulSoup to:
- Strip non-content elements (script, style, nav, footer, etc.)
- Extract:
  - pricing signals
  - headings (h1–h4)
  - feature lists (ul/li)
  - tables
- Return a structured JSON-friendly dict plus clean_text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup

from app.utils.logger import get_logger

logger = get_logger(__name__)

PRICE_REGEX = re.compile(r"\$?\d+(?:,\d{3})*(?:\.\d{2})?")
CURRENCY_REGEX = re.compile(r"[\$€£¥]")
PERCENT_REGEX = re.compile(r"\d+%")
BILLING_TERM_REGEX = re.compile(
  r"(per\s+(month|year|yr|week|day)|monthly|annually|yearly)",
  re.IGNORECASE,
)


@dataclass
class PricingSignal:
  raw: str
  currency: Optional[str]
  has_percent: bool
  billing_term: Optional[str]
  context: str  # small surrounding text


@dataclass
class ExtractionResult:
  pricing: List[Dict[str, Any]]
  headings: List[Dict[str, Any]]
  features: List[List[str]]
  tables: List[List[List[str]]]
  clean_text: str

  def to_dict(self) -> Dict[str, Any]:
    return {
      "pricing": self.pricing,
      "headings": self.headings,
      "features": self.features,
      "tables": self.tables,
      "clean_text": self.clean_text,
    }


def _clean_html(html: str) -> BeautifulSoup:
  soup = BeautifulSoup(html, "lxml")

  # Remove non-content elements
  for tag in soup(["script", "style", "nav", "footer", "noscript", "meta", "link"]):
    tag.decompose()

  return soup


def _extract_pricing(soup: BeautifulSoup) -> List[Dict[str, Any]]:
  results: List[Dict[str, Any]] = []

  # Search text nodes containing price-like patterns
  for element in soup.find_all(text=PRICE_REGEX):
    text = element.strip()
    if not text:
      continue

    match = PRICE_REGEX.search(text)
    if not match:
      continue

    price_str = match.group(0)
    currency_match = CURRENCY_REGEX.search(text)
    percent_match = PERCENT_REGEX.search(text)
    billing_match = BILLING_TERM_REGEX.search(text)

    # Simple context: the full text plus parent heading if any
    context_parts = [text]
    parent = element.parent
    if parent:
      parent_heading = parent.find_previous(["h1", "h2", "h3", "h4"])
      if parent_heading and parent_heading.get_text(strip=True):
        context_parts.append(parent_heading.get_text(strip=True))

    context = " | ".join(context_parts)

    signal = PricingSignal(
      raw=price_str,
      currency=currency_match.group(0) if currency_match else None,
      has_percent=bool(percent_match),
      billing_term=billing_match.group(0) if billing_match else None,
      context=context[:300],
    )
    results.append(asdict(signal))

  return results


def _extract_headings(soup: BeautifulSoup) -> List[Dict[str, Any]]:
  headings: List[Dict[str, Any]] = []
  for level in ["h1", "h2", "h3", "h4"]:
    for tag in soup.find_all(level):
      text = tag.get_text(strip=True)
      if not text:
        continue
      headings.append({"level": level, "text": text})
  return headings


def _extract_features(soup: BeautifulSoup) -> List[List[str]]:
  feature_blocks: List[List[str]] = []
  for ul in soup.find_all("ul"):
    items = []
    for li in ul.find_all("li"):
      text = li.get_text(" ", strip=True)
      if text:
        items.append(text)
    if items:
      feature_blocks.append(items)
  return feature_blocks


def _extract_tables(soup: BeautifulSoup) -> List[List[List[str]]]:
  tables: List[List[List[str]]] = []
  for table in soup.find_all("table"):
    rows: List[List[str]] = []
    for tr in table.find_all("tr"):
      cells = []
      for cell in tr.find_all(["th", "td"]):
        text = cell.get_text(" ", strip=True)
        cells.append(text)
      if cells:
        rows.append(cells)
    if rows:
      tables.append(rows)
  return tables


def _extract_clean_text(soup: BeautifulSoup) -> str:
  # Similar to existing scraper_service._extract_visible_text
  text = soup.get_text(" ", strip=True)
  # Collapse whitespace
  tokens = text.split()
  return " ".join(tokens)


def extract_structured(html: Optional[str]) -> ExtractionResult:
  """
  Deterministically extract structured signals from HTML.

  Returns an ExtractionResult with pricing/headings/features/tables/clean_text.
  """
  if not html:
    return ExtractionResult(
      pricing=[],
      headings=[],
      features=[],
      tables=[],
      clean_text="",
    )

  try:
    soup = _clean_html(html)
    pricing = _extract_pricing(soup)
    headings = _extract_headings(soup)
    features = _extract_features(soup)
    tables = _extract_tables(soup)
    clean_text = _extract_clean_text(soup)

    return ExtractionResult(
      pricing=pricing,
      headings=headings,
      features=features,
      tables=tables,
      clean_text=clean_text,
    )
  except Exception as e:
    logger.error(f"Error in deterministic extraction: {e}")
    return ExtractionResult(
      pricing=[],
      headings=[],
      features=[],
      tables=[],
      clean_text="",
    )

