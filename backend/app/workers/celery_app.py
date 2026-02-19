"""
Celery application configuration
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "changesignal",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    "check-monitored-pages": {
        "task": "app.workers.tasks.check_all_monitored_pages",
        "schedule": crontab(minute="*/10"),  # Every 10 minutes
    },
    "retry-failed-alerts": {
        "task": "app.workers.tasks.retry_failed_alerts",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
    "cleanup-old-snapshots": {
        "task": "app.workers.tasks.cleanup_old_snapshots",
        "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

if __name__ == "__main__":
    celery_app.start()
