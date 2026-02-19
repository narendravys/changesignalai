"""
ChangeSignal AI - Main FastAPI Application
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time

from app.core.config import settings
from app.core.database import init_db
from app.core.redis_client import RedisClient
from app.utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting ChangeSignal AI backend...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    # Test Redis connection
    try:
        redis_client = RedisClient.get_client()
        redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ChangeSignal AI backend...")
    RedisClient.close()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous web intelligence platform for monitoring competitor websites",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=f"/{settings.API_VERSION}/docs",
    redoc_url=f"/{settings.API_VERSION}/redoc",
    openapi_url=f"/{settings.API_VERSION}/openapi.json",
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to responses"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "0.1.0"
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": "0.1.0",
        "docs": f"/{settings.API_VERSION}/docs"
    }


# API routes
from app.api import (
    auth, organizations, competitors, monitored_pages, changes,
    snapshots, comments, notifications, analytics, admin, feedback, subscription
)

app.include_router(auth.router, prefix=f"/{settings.API_VERSION}/auth", tags=["Authentication"])
app.include_router(organizations.router, prefix=f"/{settings.API_VERSION}/organizations", tags=["Organizations"])
app.include_router(competitors.router, prefix=f"/{settings.API_VERSION}/competitors", tags=["Competitors"])
app.include_router(monitored_pages.router, prefix=f"/{settings.API_VERSION}/pages", tags=["Monitored Pages"])
app.include_router(changes.router, prefix=f"/{settings.API_VERSION}/changes", tags=["Changes"])
app.include_router(snapshots.router, prefix=f"/{settings.API_VERSION}/snapshots", tags=["Snapshots"])
app.include_router(comments.router, prefix=f"/{settings.API_VERSION}/comments", tags=["Comments"])
app.include_router(notifications.router, prefix=f"/{settings.API_VERSION}/notifications", tags=["Notifications"])
app.include_router(analytics.router, prefix=f"/{settings.API_VERSION}/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix=f"/{settings.API_VERSION}/admin", tags=["Admin"])
app.include_router(feedback.router, prefix=f"/{settings.API_VERSION}/feedback", tags=["Feedback"])
app.include_router(subscription.router, prefix=f"/{settings.API_VERSION}/subscription", tags=["Subscription"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
