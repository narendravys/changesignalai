"""
Input validation utilities
"""
import re
from urllib.parse import urlparse
from typing import Optional


def validate_url(url: str) -> bool:
    """
    Validate if a URL is properly formatted and safe
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid, False otherwise
    """
    try:
        result = urlparse(url)
        # Check if scheme and netloc exist
        if not all([result.scheme, result.netloc]):
            return False
        
        # Only allow http and https
        if result.scheme not in ["http", "https"]:
            return False
        
        # Block localhost and private IPs for security
        blocked_hosts = ["localhost", "127.0.0.1", "0.0.0.0"]
        if result.netloc.split(":")[0] in blocked_hosts:
            return False
        
        # Block private IP ranges
        ip_pattern = r"^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)"
        if re.match(ip_pattern, result.netloc):
            return False
        
        return True
    except Exception:
        return False


def sanitize_html(html: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize HTML input
    
    Args:
        html: HTML string to sanitize
        max_length: Optional maximum length
        
    Returns:
        Sanitized HTML string
    """
    # Basic sanitization - remove script tags
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove inline event handlers
    sanitized = re.sub(r'\son\w+\s*=\s*["\'][^"\']*["\']', '', sanitized, flags=re.IGNORECASE)
    
    # Truncate if needed
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_email(email: str) -> bool:
    """
    Validate email format
    
    Args:
        email: Email string to validate
        
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    
    Args:
        password: Password string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, ""
