"""
Redis client configuration
"""
import redis
from typing import Optional
from app.core.config import settings


class RedisClient:
    """Redis client singleton"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        """Get Redis client instance"""
        if cls._instance is None:
            cls._instance = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
        return cls._instance
    
    @classmethod
    def close(cls):
        """Close Redis connection"""
        if cls._instance:
            cls._instance.close()
            cls._instance = None


def get_redis() -> redis.Redis:
    """Dependency to get Redis client"""
    return RedisClient.get_client()
