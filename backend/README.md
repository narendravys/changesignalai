# ChangeSignal AI Backend

Backend service for ChangeSignal AI - An autonomous web intelligence platform for monitoring competitor websites.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic
- **Authentication**: JWT (python-jose)
- **Web Scraping**: Playwright
- **LLM**: OpenAI API
- **Background Tasks**: Celery + Redis
- **Cache/Queue**: Redis

## Project Structure

```
backend/
├── app/
│   ├── api/           # API route handlers
│   ├── core/          # Core configuration (database, security, config)
│   ├── models/        # SQLAlchemy models
│   ├── services/      # Business logic services
│   ├── workers/       # Celery tasks and background workers
│   └── utils/         # Utility functions
├── alembic/           # Database migrations
├── main.py            # FastAPI application entry point
├── requirements.txt   # Python dependencies
└── .env.example       # Environment variables template
```

## Setup Instructions

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### 2. Environment Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### 3. Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

**Required environment variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key (min 32 characters)
- `OPENAI_API_KEY`: OpenAI API key for LLM features
- `REDIS_URL`: Redis connection string

### 4. Database Setup

```bash
# Run migrations
alembic upgrade head
```

### 5. Run the Application

**Development mode:**
```bash
python main.py
```

**Production mode with Uvicorn:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 6. Run Celery Workers

In a separate terminal:

```bash
celery -A app.workers.celery_app worker --loglevel=info
```

### 7. Run Celery Beat (Scheduler)

In another terminal:

```bash
celery -A app.workers.celery_app beat --loglevel=info
```

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/v1/docs`
- ReDoc: `http://localhost:8000/v1/redoc`

## Development

### Create a new migration

```bash
alembic revision --autogenerate -m "description of changes"
alembic upgrade head
```

### Run with Docker Compose

```bash
docker-compose up -d
```

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## License

Proprietary
