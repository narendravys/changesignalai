# ChangeSignal AI - Setup Guide

This guide will walk you through setting up ChangeSignal AI from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [First Time Setup](#first-time-setup)
6. [Testing](#testing)
7. [Common Issues](#common-issues)

## Prerequisites

### Required

- **Docker Desktop** (v20.10+) or Docker Engine + Docker Compose
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Verify: `docker --version` and `docker-compose --version`

- **OpenAI API Key**
  - Sign up at [OpenAI Platform](https://platform.openai.com/)
  - Create an API key from [API Keys page](https://platform.openai.com/api-keys)
  - Ensure you have credits available

### Optional but Recommended

- **Slack Workspace** (for Slack notifications)
  - Create a Slack app and webhook URL
  - [Slack Incoming Webhooks Guide](https://api.slack.com/messaging/webhooks)

- **Email Account** (for email notifications)
  - Gmail with App Password (recommended)
  - [Create Gmail App Password](https://support.google.com/accounts/answer/185833)

## Installation

### Step 1: Clone or Download

```bash
# If you have git
git clone <repository-url>
cd scrapper-agent

# Or download and extract the ZIP file
```

### Step 2: Verify File Structure

Ensure you have this structure:

```
scrapper-agent/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Configuration

### Step 1: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Open .env in your text editor
```

### Step 2: Set Required Variables

Edit `.env` and set these **required** values:

```env
# Generate a secure secret key (32+ characters)
# You can use: openssl rand -hex 32
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-at-least-32-chars

# Your OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Step 3: Set Optional Variables

For Slack notifications:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

For email notifications:

```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

## Running the Application

### Step 1: Start Services

```bash
# Build and start all services in detached mode
docker-compose up -d

# This will start:
# - PostgreSQL database
# - Redis cache
# - Backend API
# - Celery worker
# - Celery beat scheduler
# - Frontend web app
```

### Step 2: Wait for Services to be Ready

```bash
# Check if all services are running
docker-compose ps

# You should see all services with "Up" status
```

Expected output:
```
NAME                     STATUS
changesignal-backend     Up
changesignal-postgres    Up (healthy)
changesignal-redis       Up (healthy)
changesignal-celery-worker   Up
changesignal-celery-beat     Up
changesignal-frontend    Up
```

### Step 3: Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# You should see: "Running upgrade -> <migration_id>, Initial migration"
```

### Step 4: Verify Services

```bash
# Test backend API
curl http://localhost:8000/health

# Should return: {"status":"healthy","app":"ChangeSignal AI",...}

# Test frontend (in browser)
# Open: http://localhost:3000
```

## First Time Setup

### Create Your Organization and Account

1. **Open the application**
   - Navigate to http://localhost:3000
   - You'll be redirected to the login page

2. **Register your organization**
   - Click the **"Register"** tab
   - Fill in the form:
     - **Organization Name**: Your company name (e.g., "Acme Inc")
     - **Organization Slug**: URL-friendly name (e.g., "acme-inc")
     - **Your Full Name**: Your name
     - **Email**: Your work email
     - **Password**: A strong password (min 8 chars, with uppercase, lowercase, and number)

3. **Complete registration**
   - Click **"Create Account"**
   - You'll be logged in automatically
   - You'll see the empty dashboard

### Add Your First Competitor

1. **Navigate to Competitors**
   - Click "Competitors" in the sidebar
   - Click **"Add Competitor"** button

2. **Fill in competitor details**
   - **Company Name**: e.g., "Competitor Inc"
   - **Domain**: e.g., "competitor.com" (without https://)
   - **Description**: Optional notes

3. **Save**
   - Click **"Add Competitor"**
   - You'll see the competitor card

### Add Your First Monitored Page

1. **Navigate to Monitoring**
   - Click "Monitoring" in the sidebar
   - Click **"Add Page"** button

2. **Configure the page**
   - **Page URL**: Full URL (e.g., "https://competitor.com/pricing")
   - **Competitor**: Select from dropdown
   - **Page Type**: e.g., "pricing", "features", "terms"
   - **Check Frequency**: daily (recommended to start)
   - **Notes**: Optional

3. **Save**
   - Click **"Add Page"**
   - Page will appear in the monitoring table

### Trigger First Check

1. **Manual check**
   - Find your page in the monitoring table
   - Click the refresh icon (🔄)
   - You'll see "Check queued successfully!"

2. **View logs**
   ```bash
   # Watch the worker process the check
   docker-compose logs -f celery-worker
   
   # You should see:
   # Task: Checking page X - https://...
   # Successfully scraped: ...
   # Snapshot created: ID=X, Success=True
   ```

3. **Check results**
   - The first check creates a baseline snapshot
   - No changes will be detected yet (need 2+ snapshots)
   - Check "Last Checked" column updates

### Wait for Second Check

The system will automatically check pages based on their frequency:
- **Hourly**: Every hour
- **Daily**: Every day at midnight UTC
- **Weekly**: Every Monday at midnight UTC

You can also trigger manual checks anytime.

## Testing

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/v1/docs  # macOS
# or visit http://localhost:8000/v1/docs in browser
```

### Test Background Jobs

```bash
# Check Celery worker is processing tasks
docker-compose logs celery-worker | grep "Task"

# Check scheduled tasks
docker-compose logs celery-beat | grep "Scheduler"
```

### Test Notifications

1. **Make a significant change on a monitored page**
   (e.g., update pricing on your test competitor's site)

2. **Trigger a check**
   - Go to Monitoring page
   - Click refresh icon on the page

3. **Check for alerts**
   - If severity is medium+, alerts will be sent
   - Check your Slack channel
   - Check your email inbox
   - Check backend logs:
     ```bash
     docker-compose logs backend | grep "alert"
     ```

## Common Issues

### Issue: "Database connection failed"

**Solution:**
```bash
# Ensure PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds and try again
```

### Issue: "OpenAI API error"

**Solution:**
1. Verify your API key in `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

2. Check you have OpenAI credits:
   - Go to https://platform.openai.com/account/billing

3. Restart backend:
   ```bash
   docker-compose restart backend celery-worker
   ```

### Issue: "Playwright browser not found"

**Solution:**
```bash
# Reinstall Playwright browsers
docker-compose exec backend playwright install chromium

# Restart worker
docker-compose restart celery-worker
```

### Issue: "Frontend can't connect to backend"

**Solution:**
1. Check backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Verify `.env.local` in frontend (if you created one):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Check browser console for CORS errors
4. Ensure `ALLOWED_ORIGINS` in backend `.env` includes frontend URL

### Issue: "Celery tasks not running"

**Solution:**
```bash
# Check Redis is running
docker-compose exec redis redis-cli PING
# Should return: PONG

# Check Celery worker logs
docker-compose logs celery-worker

# Restart workers
docker-compose restart celery-worker celery-beat
```

### Issue: "Port already in use"

**Solution:**
```bash
# If port 8000 is in use
# Change in docker-compose.yml:
#   ports:
#     - "8001:8000"  # Use 8001 instead

# If port 3000 is in use
# Change in docker-compose.yml:
#   ports:
#     - "3001:3000"  # Use 3001 instead

# Restart services
docker-compose down
docker-compose up -d
```

## Next Steps

Once everything is working:

1. ✅ Add more competitors
2. ✅ Monitor key pages (pricing, features, terms, blog)
3. ✅ Set up Slack notifications
4. ✅ Configure email notifications
5. ✅ Review changes regularly
6. ✅ Adjust check frequencies as needed

## Getting Help

If you're still having issues:

1. **Check logs**:
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View specific service
   docker-compose logs -f backend
   docker-compose logs -f celery-worker
   ```

2. **Verify environment**:
   ```bash
   # Check Docker versions
   docker --version
   docker-compose --version
   
   # Check running containers
   docker-compose ps
   
   # Check resource usage
   docker stats
   ```

3. **Clean restart**:
   ```bash
   # Stop everything
   docker-compose down
   
   # Remove volumes (WARNING: deletes data)
   docker-compose down -v
   
   # Rebuild and start
   docker-compose build --no-cache
   docker-compose up -d
   
   # Reinitialize database
   docker-compose exec backend alembic upgrade head
   ```

---

**Happy monitoring! 🚀**
