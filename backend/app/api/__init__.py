"""
API routes package

Import all routers here
"""
from app.api import auth, organizations, competitors, monitored_pages, changes

__all__ = [
    "auth",
    "organizations",
    "competitors",
    "monitored_pages",
    "changes",
]
