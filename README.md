# ChangeSignal AI

**Autonomous Web Intelligence Platform for Competitor Monitoring**

ChangeSignal AI is a production-ready SaaS MVP that monitors competitor websites, detects semantic (meaning-based) changes, classifies severity, explains business impact, and suggests recommended actions using LLM-powered analysis.

**Investor demo:** See [INVESTOR_DEMO.md](./INVESTOR_DEMO.md) for a demo checklist, suggested script, and tips for funding conversations.

## 🎯 Key Features

- **Autonomous Monitoring**: Automatically check competitor websites on scheduled intervals
- **Semantic Change Detection**: AI-powered analysis to detect meaningful changes, not just text diffs
- **Business Impact Analysis**: LLM explains what changed and why it matters
- **Smart Alerts**: Slack and email notifications for important changes
- **Multi-tenant**: Organization-based accounts with multi-user support
- **Historical Tracking**: Store and compare snapshots over time
- **Beautiful Dashboard**: Clean SaaS-style UI built with Next.js and Tailwind CSS

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Reliable relational database
- **SQLAlchemy + Alembic** - ORM and migrations
- **Playwright** - Browser automation for scraping JS-heavy sites
- **OpenAI API** - LLM-based semantic analysis
- **Celery + Redis** - Background jobs and task queue
- **JWT Authentication** - Secure token-based auth

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client for API calls

### Infrastructure
- **Docker + Docker Compose** - Containerized deployment
- **PostgreSQL 15** - Database server
- **Redis 7** - Cache and message broker

## 📦 Project Structure

```
scrapper-agent/
├── backend/                 # Python/FastAPI backend
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── workers/        # Celery tasks
│   │   └── utils/          # Utilities
│   ├── alembic/            # Database migrations
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
│
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # API client and utilities
│   ├── hooks/             # React hooks
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml     # Docker orchestration
├── .env.example          # Single env template (copy to .env; used by backend, frontend, Docker)
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- (Optional) Slack webhook URL for notifications
- (Optional) SMTP credentials for email notifications

### 1. Clone the Repository

```bash
git clone https://github.com/narendravys/changesignalai.git
cd changesignalai
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# One .env at project root is used by backend, frontend, and Docker. Edit and set (at minimum):
# - SECRET_KEY (generate a secure 32+ character string)
# - OPENAI_API_KEY (your OpenAI API key)
# - GROQ_API_KEY= (Your Groq API key)
# - GROQ_MODEL= (typically the llama model which suits best for you)
# - GROQ_TEMPERATURE=(set min for best results eg: 0.1)
# - SLACK_WEBHOOK_URL (optional)
# - SMTP credentials (optional)
```

**Important Environment Variables:**

```env
# Required
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-at-least-32-chars
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional but recommended
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Start the Application

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on http://localhost:8000
- **Frontend** on http://localhost:3000
- **Celery Worker** (background tasks)
- **Celery Beat** (scheduler)

### 4. Initialize the Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 5. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/v1/docs
- **API ReDoc**: http://localhost:8000/v1/redoc

**If you see "This site can't be reached" or ERR_CONNECTION_REFUSED (e.g. when using Docker in WSL2 and opening the browser on Windows):**

1. **Use the port explicitly:** Try **http://127.0.0.1:3000** (frontend) and **http://127.0.0.1:8000/v1/docs** (API). Sometimes `127.0.0.1` works when `localhost` does not.
2. **Confirm the app responds inside WSL:** In a WSL terminal run:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   ```
   If you get `200` or `304`, the app is up; the issue is reaching it from Windows.
3. **Use WSL’s IP from Windows:** In WSL run `hostname -I | awk '{print $1}'`, then in your Windows browser open `http://<that-IP>:3000` (e.g. `http://172.22.1.5:3000`; replace `<that-IP>` with the number from the previous command). The IP can change after WSL restarts.
4. **Restart WSL port forwarding:** In PowerShell (as Administrator) run `wsl --shutdown`, then open WSL again and run `docker compose up -d`. After a moment, try **http://127.0.0.1:3000** again from Windows.

### 6. Create Your First Account

1. Go to http://localhost:3000
2. Click on "Register" tab
3. Fill in:
   - Organization name (e.g., "Acme Inc")
   - Organization slug (e.g., "acme-inc")
   - Your name and email
   - A strong password
4. Click "Create Account"

You'll be automatically logged in and redirected to the dashboard!

## 📖 User Guide

### Adding Competitors

1. Navigate to **Competitors** page
2. Click **"Add Competitor"**
3. Enter:
   - Company name
   - Domain (e.g., "competitor.com")
   - Optional description
4. Click **"Add Competitor"**

### Monitoring Pages

1. Navigate to **Monitoring** page
2. Click **"Add Page"**
3. Configure:
   - Page URL (full URL to monitor)
   - Select competitor
   - Page type (e.g., "pricing", "features", "terms")
   - Check frequency (hourly, daily, weekly)
4. Click **"Add Page"**

The system will start checking this page automatically based on the frequency you set.

### Reviewing Changes

1. Navigate to **Changes** page
2. View all detected changes with:
   - Severity levels (Low, Medium, High, Critical)
   - Change types (pricing, features, policy, etc.)
   - Business impact analysis
   - Recommended actions
3. Filter by severity or status
4. Click **"Acknowledge"** to mark changes as reviewed

### Understanding Severity Levels

- **Low**: Minor content updates, cosmetic changes
- **Medium**: Feature updates, content additions/removals, price changes
- **High**: Significant pricing changes, new major features, policy updates
- **Critical**: Major pricing drops, legal/compliance changes, competitive threats

## 🔧 Development

### Backend Development

```bash
# Install dependencies locally (for IDE support)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run backend locally (without Docker)
python main.py

# Create a new migration
alembic revision --autogenerate -m "description"
alembic upgrade head

# Run Celery worker locally
celery -A app.workers.celery_app worker --loglevel=info

# Run Celery beat locally
celery -A app.workers.celery_app beat --loglevel=info
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start

# Lint
npm run lint
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U changesignal -d changesignal_db

# Backup database
docker-compose exec postgres pg_dump -U changesignal changesignal_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U changesignal changesignal_db < backup.sql
```

### Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis
docker-compose exec redis redis-cli MONITOR

# Clear all data
docker-compose exec redis redis-cli FLUSHALL
```

## 🔐 Security Features

- **Password Hashing**: Bcrypt-based secure password storage
- **JWT Tokens**: Stateless authentication
- **URL Validation**: Prevents monitoring of internal/private resources
- **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries
- **XSS Protection**: React's built-in XSS prevention
- **Rate Limiting**: API rate limiting (configurable)
- **HTML Sanitization**: Input sanitization for stored HTML

## 📊 Monitoring & Observability

### Health Check

```bash
# Check API health
curl http://localhost:8000/health
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f celery-worker
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 backend
```

### Celery Monitoring

```bash
# Check active tasks
docker-compose exec celery-worker celery -A app.workers.celery_app inspect active

# Check scheduled tasks
docker-compose exec celery-worker celery -A app.workers.celery_app inspect scheduled

# Check worker stats
docker-compose exec celery-worker celery -A app.workers.celery_app inspect stats
```

## 🎨 Customization

### Adding New Page Types

Edit `backend/app/models/monitored_page.py` and add to the page types.

### Modifying Check Frequencies

Edit `backend/app/workers/celery_app.py` to adjust the `beat_schedule`.

### Customizing Alert Templates

Edit `backend/app/services/alert_service.py` to modify Slack and email templates.

### Styling the Frontend

Edit `frontend/app/globals.css` and `frontend/tailwind.config.ts`.

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Ensure database is ready
docker-compose exec postgres pg_isready

# Try rebuilding
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Celery tasks not running

```bash
# Check worker status
docker-compose logs celery-worker

# Check Redis connection
docker-compose exec redis redis-cli PING

# Restart workers
docker-compose restart celery-worker celery-beat
```

### Database migrations failing

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

### Playwright errors

```bash
# Reinstall Playwright browsers
docker-compose exec backend playwright install chromium
```

## 📝 API Documentation

Once the backend is running, visit:
- **Interactive Swagger UI**: http://localhost:8000/v1/docs
- **ReDoc**: http://localhost:8000/v1/redoc

Key endpoints:
- `POST /v1/auth/register` - Register new organization and user
- `POST /v1/auth/login` - Login
- `GET /v1/competitors` - List competitors
- `POST /v1/competitors` - Add competitor
- `GET /v1/pages` - List monitored pages
- `POST /v1/pages` - Add monitored page
- `POST /v1/pages/{id}/check` - Trigger manual check
- `GET /v1/changes` - List change events
- `GET /v1/changes/stats/summary` - Get change statistics

## 🚢 Production Deployment

### Environment Variables for Production

```env
# Set these in production
APP_ENV=production
DEBUG=False

# Use strong secrets
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# Use production database
DATABASE_URL=postgresql://user:pass@production-db-host:5432/dbname

# Configure allowed origins
ALLOWED_ORIGINS=https://yourdomain.com

# Enable monitoring
SENTRY_DSN=<your-sentry-dsn>
```

### Performance Tuning

1. **Database**: Use connection pooling, add indexes
2. **Celery**: Increase worker concurrency based on CPU cores
3. **Redis**: Configure maxmemory and eviction policies
4. **Frontend**: Enable Next.js output: 'standalone' for smaller images

### Backup Strategy

1. **Database**: Set up automated PostgreSQL backups
2. **Redis**: Enable AOF persistence
3. **Snapshots**: Consider archiving old snapshots to S3/object storage

## 📄 License

Proprietary - All rights reserved

## 🤝 Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the API documentation at `/v1/docs`
3. Check Docker logs: `docker-compose logs -f`

## 🎉 What's Next?

- ✅ Add your first competitor
- ✅ Monitor important pages (pricing, features, terms)
- ✅ Review detected changes
- ✅ Configure Slack/email notifications
- 📊 Export change reports to CSV (bonus feature)
- 🤖 Set up weekly summary emails (bonus feature)
- 🔍 Enable semantic search with pgvector (bonus feature)

---

Built with ❤️ by Narendra Vyas using FastAPI, Next.js, and OpenAI
