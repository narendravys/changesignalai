"""
Web scraping service using Playwright
"""
import hashlib
import time
import os
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from bs4 import BeautifulSoup
from datetime import datetime

from app.core.config import settings
from app.utils.logger import get_logger
from app.utils.validators import validate_url

logger = get_logger(__name__)

# Screenshot storage directory
SCREENSHOT_DIR = "/app/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


class ScraperService:
    """Service for scraping web pages with Playwright"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.playwright = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def initialize(self):
        """Initialize Playwright browser"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            logger.info("Playwright browser initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Playwright: {e}")
            raise
    
    async def close(self):
        """Close Playwright browser"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Playwright browser closed")
        except Exception as e:
            logger.error(f"Error closing Playwright: {e}")
    
    async def scrape_page(self, url: str) -> Dict[str, Any]:
        """
        Scrape a web page and return structured data
        
        Args:
            url: URL to scrape
            
        Returns:
            Dictionary containing:
                - success: bool
                - raw_html: str
                - cleaned_text: str
                - page_title: str
                - http_status_code: int
                - content_hash: str
                - load_time_ms: int
                - page_size_bytes: int
                - error_message: str (if failed)
        """
        # Validate URL
        if not validate_url(url):
            return {
                "success": False,
                "error_message": "Invalid URL format",
                "raw_html": None,
                "cleaned_text": None,
                "page_title": None,
                "http_status_code": None,
                "content_hash": None,
                "load_time_ms": None,
                "page_size_bytes": None,
            }
        
        page: Optional[Page] = None
        start_time = time.time()
        
        try:
            # Create new page
            page = await self.context.new_page()
            
            # Set timeout
            page.set_default_timeout(settings.TIMEOUT_SECONDS * 1000)
            
            # Navigate to page
            response = await page.goto(url, wait_until='networkidle')
            
            # Get HTTP status
            http_status = response.status if response else None
            
            # Wait for page to be fully loaded
            await page.wait_for_load_state('networkidle')
            
            # Get page title
            page_title = await page.title()
            
            # Get raw HTML
            raw_html = await page.content()
            
            # Calculate metrics
            load_time_ms = int((time.time() - start_time) * 1000)
            page_size_bytes = len(raw_html.encode('utf-8'))
            
            # Extract visible text
            cleaned_text = await self._extract_visible_text(raw_html)
            
            # Generate content hash
            content_hash = self._generate_hash(cleaned_text)
            
            # Capture screenshot
            screenshot_url = await self._capture_screenshot(page, url)
            
            logger.info(f"Successfully scraped: {url} (Status: {http_status}, Size: {page_size_bytes} bytes)")
            
            return {
                "success": True,
                "raw_html": raw_html,
                "cleaned_text": cleaned_text,
                "page_title": page_title,
                "http_status_code": http_status,
                "content_hash": content_hash,
                "screenshot_url": screenshot_url,
                "load_time_ms": load_time_ms,
                "page_size_bytes": page_size_bytes,
                "error_message": None,
            }
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            load_time_ms = int((time.time() - start_time) * 1000)
            
            return {
                "success": False,
                "error_message": str(e),
                "raw_html": None,
                "cleaned_text": None,
                "page_title": None,
                "http_status_code": None,
                "content_hash": None,
                "load_time_ms": load_time_ms,
                "page_size_bytes": None,
            }
            
        finally:
            if page:
                await page.close()
    
    async def _extract_visible_text(self, html: str) -> str:
        """
        Extract visible text from HTML using BeautifulSoup
        
        Args:
            html: Raw HTML content
            
        Returns:
            Cleaned visible text
        """
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Remove script and style elements
            for script in soup(["script", "style", "meta", "link", "noscript"]):
                script.decompose()
            
            # Get text
            text = soup.get_text(separator=' ', strip=True)
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return ""
    
    def _generate_hash(self, content: str) -> str:
        """
        Generate SHA256 hash of content
        
        Args:
            content: Content to hash
            
        Returns:
            Hexadecimal hash string
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    async def _capture_screenshot(self, page: Page, url: str) -> Optional[str]:
        """
        Capture screenshot during scraping
        
        Args:
            page: Playwright page object
            url: URL being scraped
            
        Returns:
            Path to screenshot file or None
        """
        try:
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
            filename = f"screenshot_{url_hash}_{timestamp}.png"
            filepath = os.path.join(SCREENSHOT_DIR, filename)
            
            # Capture screenshot
            await page.screenshot(path=filepath, full_page=True)
            
            logger.info(f"Screenshot captured: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error capturing screenshot: {e}")
            return None
    
    async def take_screenshot(self, url: str, output_path: str) -> bool:
        """
        Take a screenshot of a web page
        
        Args:
            url: URL to screenshot
            output_path: Path to save screenshot
            
        Returns:
            True if successful, False otherwise
        """
        page: Optional[Page] = None
        
        try:
            page = await self.context.new_page()
            page.set_default_timeout(settings.TIMEOUT_SECONDS * 1000)
            
            await page.goto(url, wait_until='networkidle')
            await page.wait_for_load_state('networkidle')
            
            await page.screenshot(path=output_path, full_page=True)
            
            logger.info(f"Screenshot saved: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error taking screenshot of {url}: {e}")
            return False
            
        finally:
            if page:
                await page.close()


# Singleton instance helper
_scraper_instance: Optional[ScraperService] = None


async def get_scraper() -> ScraperService:
    """
    Get or create scraper service instance
    
    Usage:
        async with get_scraper() as scraper:
            result = await scraper.scrape_page(url)
    """
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = ScraperService()
        await _scraper_instance.initialize()
    return _scraper_instance
