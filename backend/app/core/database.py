"""
Database configuration and session management
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings

# Do not log every SQL query; only WARNING and above from SQLAlchemy engine
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Create SQLAlchemy engine (echo=False: do not log every SQL query; set SQL_ECHO=1 to debug)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    # Import all models here to ensure they're registered with Base
    from app.models import (
        user, organization, competitor, 
        monitored_page, snapshot, change_event, alert
    )
    Base.metadata.create_all(bind=engine)
