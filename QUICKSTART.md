# ChangeSignal AI - Quick Start Guide

**First-time setup or production deploy?** See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for prerequisites, `.env` setup, and production build steps.

## 🎉 Application Successfully Running!

All services are up and running. Here's how to access them:

## Access URLs

- **Frontend (Next.js)**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/v1/docs
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6380

## Container Status

All 6 containers are running:
- ✅ `changesignal-backend` - FastAPI backend (port 8001)
- ✅ `changesignal-celery-worker` - Background task worker
- ✅ `changesignal-celery-beat` - Periodic task scheduler
- ✅ `changesignal-frontend` - Next.js frontend (port 3000)
- ✅ `changesignal-postgres` - PostgreSQL database (port 5433)
- ✅ `changesignal-redis` - Redis cache/broker (port 6380)

## Database Status

✅ Database initialized with all tables:
- `users` - User accounts
- `organizations` - Organization/team management
- `competitors` - Tracked competitor companies
- `monitored_pages` - Webpages being monitored
- `snapshots` - Historical page captures
- `change_events` - Detected changes with LLM analysis
- `alerts` - Notification records

## Important Notes

### Port Changes (due to conflicts)
The following ports were changed from defaults to avoid conflicts with services already running on your system:
- **PostgreSQL**: 5433 (instead of 5432)
- **Backend API**: 8001 (instead of 8000)
- **Redis**: 6380 (instead of 6379)

### Environment Configuration
Your `.env` file is configured with:
- Database connection
- Redis connection
- JWT secret key
- OpenAI API key placeholder
- SMTP and Slack webhook placeholders

**⚠️ IMPORTANT**: Update the following in your `.env` file for full functionality:
```bash
# Required for LLM features
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Optional: For Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional: For email notifications
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Getting Started

### 1. Create Your First Account
Visit http://localhost:3000 and you'll be redirected to the registration page:
- Enter your organization name
- Create your admin user account
- You'll be logged in automatically

### 2. Add Competitors
- Go to the "Competitors" page
- Add competitor companies you want to monitor

### 3. Add Monitored Pages
- Navigate to "Monitoring" page
- Add URLs of competitor pages to track
- Set check frequency (hourly, daily, weekly)

### 4. View Changes
- Check the "Changes" page to see detected changes
- Filter by severity, type, and acknowledgment status
- View LLM-generated impact analysis and recommendations

## Useful Commands

### View Container Logs
```bash
# All containers
docker compose logs -f

# Specific container
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop Services
```bash
docker compose down
```

### Start Services Again
```bash
docker compose up -d
```

### Database Operations
**On a new system or fresh database**, run migrations first so all tables (organizations, users, competitors, monitored_pages, snapshots, change_events, alerts, notification_preferences, comments, activity_logs, feedback, and hybrid-engine fields) are created in the correct sequence:

```bash
docker compose exec backend alembic upgrade head
```

This runs: initial (base tables) → 003 (engagement) → 004 (subscription) → 005 (hybrid engine).

# Create new migration
docker compose exec backend alembic revision --autogenerate -m "Description"

# Access PostgreSQL directly
docker compose exec postgres psql -U changesignal -d changesignal_db
```

### Trigger Manual Check
Use the "Check Now" button on the Monitoring page, or via API:
```bash
curl -X POST http://localhost:8001/v1/pages/{page_id}/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Celery Tasks

The following background tasks are running:
- **Every 1 minute**: Check monitored pages based on their schedule
- **Every 10 minutes**: Retry failed alerts
- **Every 24 hours**: Clean up old snapshots (older than 90 days)

## Troubleshooting

### Dashboard says "Cannot reach the API at http://localhost:8001/v1"?
The frontend cannot reach the backend. Do the following:

1. **Start the backend** (if using Docker):
   ```bash
   docker compose up -d
   ```
   Or start only backend + dependencies: `docker compose up -d postgres redis backend`

2. **Check that the API is reachable** in the same browser:
   - Open [http://localhost:8001/health](http://localhost:8001/health) — you should see `{"status":"healthy"}`.
   - If that link fails, the backend is not running or not reachable on port 8001.

3. **If you run the frontend on the host** (e.g. `cd frontend && npm run dev`):
   - Create `frontend/.env.local` from `frontend/.env.local.example`.
   - Set `NEXT_PUBLIC_API_URL=http://localhost:8001` (or the URL where your backend is reachable).
   - Restart the frontend dev server after changing env.

4. **If you use a different host/port for the API**, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to that base URL (e.g. `http://my-server:8001`).

5. **Health link works but dashboard still fails?** Often CORS: you opened the app at **http://127.0.0.1:3000** but the backend only allows **http://localhost:3000**. Fix: in the project root `.env` set:
   ```bash
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8001,http://127.0.0.1:8001
   ```
   Then restart the backend: `docker compose restart backend`. Or use the same host in the browser (e.g. open http://localhost:3000 instead of 127.0.0.1).

### Frontend not loading or container keeps restarting?
On some Linux/Docker setups the Next.js dev server can exit with a compiler error (SIGBUS). If the frontend container never shows "Ready" and keeps restarting:

**Option A – Run the frontend on your machine (recommended for dev):**
```bash
cd frontend
npm install
npm run dev
```
Then open http://localhost:3000. Use `docker compose up -d` only for backend, Postgres, Redis, and Celery.

**Option B – Check Docker logs:**
```bash
docker compose logs frontend
```

### Backend errors?
```bash
docker compose logs backend
```

### Celery not processing tasks?
```bash
docker compose logs celery-worker
docker compose logs celery-beat
```

### Database connection issues?
```bash
docker compose logs postgres
# Check if PostgreSQL is healthy
docker compose ps
```

## Next Steps

1. **Add your OpenAI API key** to `.env` for LLM-powered change analysis
2. **Configure alerts** by adding Slack webhook or SMTP credentials
3. **Start monitoring** by adding competitors and their pages
4. **Review the API docs** at http://localhost:8001/v1/docs for integration

## Architecture Overview

- **Backend**: FastAPI with async support
- **Database**: PostgreSQL 15 for data persistence
- **Cache/Queue**: Redis for Celery and caching
- **Background Jobs**: Celery for async task processing
- **Frontend**: Next.js 14 with App Router
- **Web Scraping**: Playwright for browser automation
- **LLM Integration**: OpenAI GPT-4 for semantic analysis

Enjoy using ChangeSignal AI! 🚀
