# ChangeSignal AI – Deployment Guide

This guide covers running the app with **Docker only** (all services in containers) and deploying to a **new device** or **production**.

---

## Prerequisites

- **Docker** (20.10+)
- **Docker Compose** (v2.x, `docker compose` or `docker-compose`)
- **Git** (to clone the repo)

On a new Linux machine:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# Log out and back in (or newgrp docker) so docker runs without sudo
```

---

## 1. New device / first-time setup (development or single-host run)

Follow these steps on a **new machine** to get the app running with one command.

### Step 1.1 – Clone the repository

```bash
git clone <your-repo-url> scrapper-agent
cd scrapper-agent
```

### Step 1.2 – Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Required | Notes |
|----------|----------|--------|
| `SECRET_KEY` | **Yes** | Min 32 characters. Generate with: `openssl rand -hex 32` |
| `OPENAI_API_KEY` | **Yes** | For LLM features (e.g. `sk-...`). Without it, some features may fail. |

For **local / same-host** use, keep:

- `DATABASE_URL=postgresql://changesignal:changesignal_pass@postgres:5432/changesignal_db`
- `REDIS_URL=redis://redis:6379/0`
- `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8001,http://127.0.0.1:8001`
- `NEXT_PUBLIC_API_URL=http://localhost:8001` (only used if you build the frontend image; dev frontend uses this from env)

### Step 1.3 – Start all services (DB, backend, frontend, Celery)

```bash
docker compose up -d
```

This will:

1. Start **PostgreSQL** (port 5433) and **Redis** (port 6380), wait for them to be healthy.
2. Start **backend** (port 8001), run **migrations** automatically on first start, then start the API.
3. Start **Celery worker** and **Celery beat**.
4. Start **frontend** (port 3000) after the backend is healthy; it installs deps and runs the Next.js dev server.

### Step 1.4 – Wait for frontend to be ready

The first time, the frontend container may take 1–2 minutes to run `npm install` and start. Check logs:

```bash
docker compose logs -f frontend
```

When you see something like `Ready on http://0.0.0.0:3000`, open:

- **App:** http://localhost:3000  
- **API docs:** http://localhost:8001/v1/docs  
- **Health:** http://localhost:8001/health  

### Step 1.5 – Optional: run migrations manually

Migrations run automatically on backend startup. To run them manually (e.g. after pulling new migrations):

```bash
docker compose exec backend python -m alembic upgrade head
```

To **disable** auto-migrations (e.g. if you run them separately), set in `.env`:

```bash
RUN_MIGRATIONS=0
```

---

## 2. Production deployment (built frontend, no dev mounts)

For production you typically want:

- Frontend built as a **static/standalone** image (no dev server, no host mounts).
- Backend running **without** `--reload`.
- **API URL** set at build time so the browser can reach your API (e.g. `https://api.yourdomain.com`).

### Step 2.1 – Set the public API URL

The URL the **browser** will use to call the API must be set when the frontend image is **built** (Next.js bakes `NEXT_PUBLIC_*` into the bundle).

On the deployment host, set in `.env` (or export before build):

```bash
# Example: same host, different port
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
# Or if API is on a subdomain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_VERSION=v1
```

For **same-host** deployment with API on port 8001:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
# Or use the server’s public hostname:
# NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### Step 2.2 – Build and run with production compose

```bash
# Build images (frontend will use NEXT_PUBLIC_API_URL from .env)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start all services (detached)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production override:

- Builds the **frontend** from `frontend/Dockerfile` (standalone Next.js build).
- Removes **volume mounts** for backend and frontend (no live code sync).
- Runs backend **without** `--reload`.
- Runs frontend with `node server.js` (production server).

### Step 2.3 – Build frontend with a custom API URL (one-off)

If you didn’t set `NEXT_PUBLIC_API_URL` in `.env` or need a different URL:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_API_VERSION=v1
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 2.4 – Reverse proxy and HTTPS (recommended for production)

Expose the app through a reverse proxy (e.g. Nginx, Caddy, Traefik) and terminate TLS:

- **Frontend:** proxy `https://yourdomain.com` → `http://localhost:3000`
- **API:** proxy `https://yourdomain.com/api` or `https://api.yourdomain.com` → `http://localhost:8001`

Then set `NEXT_PUBLIC_API_URL` to that public API URL and set `ALLOWED_ORIGINS` in `.env` to include your frontend origin (e.g. `https://yourdomain.com`).

Example **Caddy** (same host, API under `/api`):

```caddy
yourdomain.com {
  reverse_proxy localhost:3000
}
api.yourdomain.com {
  reverse_proxy localhost:8001
}
```

Set:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

---

## 3. Ports and services summary

| Service        | Port (host) | Purpose                    |
|----------------|-------------|----------------------------|
| Frontend       | 3000        | Next.js app                |
| Backend API    | 8001        | FastAPI (internal: 8000)   |
| PostgreSQL     | 5433        | Database (internal: 5432)  |
| Redis          | 6380        | Cache/queue (internal: 6379) |

Ensure these ports are free or change them in `docker-compose.yml` (and `docker-compose.prod.yml` if you override ports there).

---

## 4. Troubleshooting

### 4.1 – “Cannot reach the API” on the frontend

- Backend must be up and healthy. Check: `curl http://localhost:8001/health`
- If you’re not on the same host (e.g. phone), use the host’s IP or hostname and set `NEXT_PUBLIC_API_URL` (and rebuild frontend if production build).
- CORS: ensure `ALLOWED_ORIGINS` in `.env` includes the origin you use to open the app (e.g. `http://127.0.0.1:3000`).

### 4.2 – Backend won’t start / migrations fail

- Check DB is up: `docker compose ps` (postgres should be “healthy”).
- Check backend logs: `docker compose logs backend`
- If migrations fail (e.g. “relation does not exist”), run manually:  
  `docker compose exec backend python -m alembic upgrade head`
- Ensure `DATABASE_URL` in `.env` uses host `postgres` and port `5432` (internal).

### 4.3 – Frontend container exits or keeps restarting

- First start can be slow (npm install). Check: `docker compose logs -f frontend`
- On some systems, the dev server can hit memory limits; the compose file sets `mem_limit: 2g`. For production, the built image uses less memory.
- If you use production compose, ensure the frontend was built:  
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml build frontend`

### 4.4 – Healthcheck failing for backend

- Backend healthcheck is `curl -f http://localhost:8000/health`. Ensure nothing else is bound to 8000 inside the container and that the app listens on `0.0.0.0:8000`.
- Increase `start_period` in `docker-compose.yml` if the backend needs more time to start (e.g. after migrations).

### 4.5 – Database or Redis connection errors

- Use **service names** in `.env`: `postgres`, `redis` (not `localhost`) for `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, etc.
- Ensure no firewall blocks container-to-container traffic on the `changesignal-network`.

---

## 5. Quick reference – commands

```bash
# Start everything (development: frontend dev server, backend with reload)
docker compose up -d

# Start everything (production: built frontend, no reload)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Stop all
docker compose down

# Rebuild after code changes (development)
docker compose up -d --build

# Rebuild production frontend with custom API URL
docker compose -f docker-compose.yml -f docker-compose.prod.yml build frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations manually
docker compose exec backend python -m alembic upgrade head

# Shell into backend
docker compose exec backend sh
```

---

## 6. End-to-end tests (user + admin)

E2E tests use Playwright and cover **user** flows (register, login, dashboard, Competitors, Monitoring, Changes, Analytics, Settings, Subscription, logout) and **admin** flows (admin dashboard, Users, Feedback, Activity, Configuration tabs, and unauthenticated redirect).

### Run E2E tests

1. **Start the app** (so frontend and API are up):
   ```bash
   docker compose up -d
   ```
   Wait until the frontend is ready (e.g. `docker compose logs -f frontend` shows “Ready”).

2. **Install frontend deps and Playwright browsers** (once per machine):
   ```bash
   cd frontend
   npm install
   npx playwright install
   ```

3. **Run tests**:
   ```bash
   cd frontend
   npm run test:e2e
   ```
   Or with UI: `npm run test:e2e:ui`

4. **Optional env** (if frontend or API run elsewhere):
   ```bash
   PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_URL=http://localhost:8001 npm run test:e2e
   ```

If the API or frontend is not reachable, the global setup fails with a short message asking you to start the stack first.

---

## 7. Checklist for a new device

- [ ] Docker and Docker Compose installed; user in `docker` group.
- [ ] Repo cloned; `cd` into project root.
- [ ] `.env` created from `.env.example`; `SECRET_KEY` and `OPENAI_API_KEY` set.
- [ ] `docker compose up -d` run; wait for frontend to show “Ready”.
- [ ] http://localhost:3000 opens; http://localhost:8001/health returns `{"status":"healthy"}`.
- [ ] (Optional) Run migrations manually if needed: `docker compose exec backend python -m alembic upgrade head`.

For **production** on that device:

- [ ] `NEXT_PUBLIC_API_URL` and `ALLOWED_ORIGINS` set for your domain.
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml build` then `up -d`.
- [ ] Reverse proxy and HTTPS configured; firewall allows only needed ports.

### E2E tests (optional)

- [ ] `docker compose up -d`; then `cd frontend && npm install && npx playwright install && npm run test:e2e` passes.
