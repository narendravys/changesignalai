"""
Application configuration using pydantic-settings
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "ChangeSignal AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://changesignal:changesignal_pass@localhost:5432/changesignal_db"
    )
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "changesignal_db"
    DB_USER: str = "changesignal"
    DB_PASSWORD: str = "changesignal_pass"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # JWT Authentication
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_TEMPERATURE: float = 0.2
    
    # Groq (Llama 3)
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama3-8b-8192"
    GROQ_TEMPERATURE: float = 0.1
    
    # Slack
    SLACK_WEBHOOK_URL: str = ""
    
    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@changesignal.ai"
    SMTP_TLS: bool = True
    
    # Monitoring
    DEFAULT_CHECK_FREQUENCY: str = "daily"
    MAX_RETRIES: int = 3
    TIMEOUT_SECONDS: int = 30
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Frontend (for password reset links, etc.)
    FRONTEND_URL: str = "http://localhost:3000"

    # Security (include both localhost and 127.0.0.1 so CORS works either way)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
    RATE_LIMIT_PER_MINUTE: int = 60
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60
    
    def get_allowed_origins(self) -> List[str]:
        """Parse and return allowed origins as a list"""
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS
    
    class Config:
        # Single .env at project root (try parent first for local runs from backend/)
        env_file = ("../.env", ".env")
        case_sensitive = True


# Global settings instance
settings = Settings()
