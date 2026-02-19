"""
Hybrid fetch layer for website monitoring.

Stage 1 of the HYBRID_ENGINE_SPEC:
- Primary HTTP fetch via aiohttp
- Max 15 concurrent requests using an asyncio.Semaphore
- Per-request timeout of 10 seconds
- Retry with exponential backoff
- Custom User-Agent header
- Optional Playwright fallback for JS-heavy pages

This module is intentionally low-level: it only fetches bytes/HTML and basic
metadata. Higher stages (extractor, diff engine, LLM, etc.) build on top of
these primitives.
"""

from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import aiohttp

from app.core.config import settings
from app.services.scraper_service import get_scraper
from app.utils.logger import get_logger
from app.utils.validators import validate_url

logger = get_logger(__name__)

# Concurrency & timeout configuration (spec-driven)
MAX_CONCURRENT_REQUESTS = 15
HTTP_TIMEOUT_SECONDS = 10  # per-spec (separate from settings.TIMEOUT_SECONDS)
MAX_RETRIES = max(1, settings.MAX_RETRIES)

_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)


@dataclass
class FetchResult:
  """
  Normalized fetch result for both aiohttp and Playwright flows.
  """

  url: str
  success: bool
  status_code: Optional[int] = None
  html: Optional[str] = None
  final_url: Optional[str] = None
  error: Optional[str] = None
  from_playwright: bool = False
  attempt_count: int = 0
  elapsed_ms: Optional[int] = None

  def to_dict(self) -> Dict[str, Any]:
    return {
      "url": self.url,
      "success": self.success,
      "status_code": self.status_code,
      "html": self.html,
      "final_url": self.final_url,
      "error": self.error,
      "from_playwright": self.from_playwright,
      "attempt_count": self.attempt_count,
      "elapsed_ms": self.elapsed_ms,
    }


async def _fetch_once(
  session: aiohttp.ClientSession,
  url: str,
) -> Tuple[bool, Optional[str], Optional[int], Optional[str]]:
  """
  Perform a single HTTP GET attempt with timeout.

  Returns:
    (success, html, status_code, error_message)
  """

  if not validate_url(url):
    return False, None, None, "Invalid URL format"

  try:
    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT_SECONDS)
    async with session.get(url, timeout=timeout) as resp:
      status = resp.status
      # Read as text with reasonable default encoding handling
      html = await resp.text(errors="ignore")
      if 200 <= status < 400 and html:
        return True, html, status, None
      return False, html, status, f"Unexpected status code: {status}"
  except asyncio.TimeoutError:
    return False, None, None, f"Request timed out after {HTTP_TIMEOUT_SECONDS}s"
  except Exception as e:
    logger.error(f"HTTP fetch error for {url}: {e}")
    return False, None, None, str(e)


async def fetch_page(
  url: str,
  *,
  use_playwright_fallback: bool = False,
) -> FetchResult:
  """
  Fetch a single page using aiohttp with retry/backoff and optional
  Playwright fallback.

  This is the primary entry point for Stage 1.
  """

  if not validate_url(url):
    return FetchResult(
      url=url,
      success=False,
      error="Invalid URL format",
      attempt_count=0,
    )

  async with _semaphore:
    import time

    start = time.time()
    attempt = 0
    last_error: Optional[str] = None
    last_status: Optional[int] = None
    last_html: Optional[str] = None

    headers = {
      "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36 ChangeSignalBot/1.0"
      )
    }

    async with aiohttp.ClientSession(headers=headers) as session:
      for attempt in range(1, MAX_RETRIES + 1):
        success, html, status_code, error = await _fetch_once(session, url)
        last_error = error
        last_status = status_code
        last_html = html

        if success:
          elapsed = int((time.time() - start) * 1000)
          logger.info(
            f"Fetched {url} via HTTP (status={status_code}, attempt={attempt}, "
            f"elapsed={elapsed}ms)"
          )
          return FetchResult(
            url=url,
            success=True,
            status_code=status_code,
            html=html,
            final_url=url,
            error=None,
            from_playwright=False,
            attempt_count=attempt,
            elapsed_ms=elapsed,
          )

        # Backoff before next attempt if any left
        if attempt < MAX_RETRIES:
          backoff_seconds = 0.5 * math.pow(2, attempt - 1)
          logger.warning(
            f"Fetch failed for {url} (attempt {attempt}/{MAX_RETRIES}): "
            f"{error}. Backing off {backoff_seconds:.1f}s."
          )
          await asyncio.sleep(backoff_seconds)

    # If we reach here, HTTP attempts failed
    # Optional: Playwright fallback for JS-heavy pages
    if use_playwright_fallback:
      logger.info(f"HTTP fetch failed for {url}; trying Playwright fallback.")
      pw_result = await fetch_with_playwright(url)
      pw_result.attempt_count = attempt
      return pw_result

    elapsed = int((time.time() - start) * 1000)
    logger.error(
      f"Failed to fetch {url} after {attempt} attempts. Last status={last_status}, "
      f"error={last_error}"
    )
    return FetchResult(
      url=url,
      success=False,
      status_code=last_status,
      html=last_html,
      final_url=url,
      error=last_error or "Failed to fetch page",
      from_playwright=False,
      attempt_count=attempt,
      elapsed_ms=elapsed,
    )


async def fetch_with_playwright(url: str) -> FetchResult:
  """
  Fallback fetch using the existing Playwright-based ScraperService.

  This is more expensive and should only be used when aiohttp fetch
  is insufficient (e.g., heavy client-side rendering).
  """
  import time

  start = time.time()

  try:
    scraper = await get_scraper()
    result = await scraper.scrape_page(url)
  except Exception as e:
    logger.error(f"Playwright fallback failed for {url}: {e}")
    return FetchResult(
      url=url,
      success=False,
      error=str(e),
      from_playwright=True,
      attempt_count=1,
      elapsed_ms=int((time.time() - start) * 1000),
    )

  elapsed = int((time.time() - start) * 1000)

  return FetchResult(
    url=url,
    success=result.get("success", False),
    status_code=result.get("http_status_code"),
    html=result.get("raw_html"),
    final_url=url,
    error=result.get("error_message"),
    from_playwright=True,
    attempt_count=1,
    elapsed_ms=elapsed,
  )


async def batch_fetch(
  urls: Iterable[str],
  *,
  use_playwright_fallback: bool = False,
) -> List[FetchResult]:
  """
  Fetch multiple URLs concurrently (up to MAX_CONCURRENT_REQUESTS).

  Args:
    urls: Iterable of URL strings
    use_playwright_fallback: if True, failed HTTP fetches will be retried
      with Playwright on a per-URL basis.

  Returns:
    List of FetchResult objects in the same order as input URLs.
  """

  tasks: List[asyncio.Task[FetchResult]] = []
  for url in urls:
    tasks.append(
      asyncio.create_task(
        fetch_page(url, use_playwright_fallback=use_playwright_fallback)
      )
    )

  results: List[FetchResult] = []
  for task in asyncio.as_completed(tasks):
    try:
      res = await task
      results.append(res)
    except Exception as e:
      logger.error(f"Unexpected error in batch_fetch task: {e}")

  # Preserve original order by URL where possible
  url_to_result: Dict[str, FetchResult] = {r.url: r for r in results}
  ordered: List[FetchResult] = []
  for url in urls:
    if url in url_to_result:
      ordered.append(url_to_result[url])
    else:
      ordered.append(
        FetchResult(
          url=url,
          success=False,
          error="No result (internal error in batch_fetch)",
        )
      )
  return ordered

