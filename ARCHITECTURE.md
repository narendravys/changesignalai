# ChangeSignal AI - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                     http://localhost:3000                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    NEXT.JS FRONTEND                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pages: Dashboard, Competitors, Monitoring, Changes      │  │
│  │  Components: Layout, Forms, Tables                       │  │
│  │  API Client: Axios with JWT auth                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API (JWT)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     FASTAPI BACKEND                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Routes:                                              │  │
│  │  • /auth      - Authentication                           │  │
│  │  • /competitors - Competitor management                  │  │
│  │  • /pages      - Monitored pages                         │  │
│  │  • /changes    - Change events                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Services:                                                │  │
│  │  • ScraperService       - Playwright web scraping        │  │
│  │  • MonitoringService    - Page checking logic            │  │
│  │  • LLMService           - OpenAI integration             │  │
│  │  • ChangeDetectionService - Comparison logic             │  │
│  │  • AlertService         - Notifications                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬──────────────────┬──────────────────┬─────────────────┘
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   POSTGRESQL   │  │     REDIS       │  │   OPENAI API        │
│   (Database)   │  │   (Cache &      │  │   (LLM Analysis)    │
│                │  │    Message      │  │                     │
│  • users       │  │    Broker)      │  │  • gpt-4-turbo      │
│  • orgs        │  │                 │  │  • Semantic change  │
│  • competitors │  │  • Task queue   │  │    detection        │
│  • pages       │  │  • Results      │  │  • Business impact  │
│  • snapshots   │  │  • Cache        │  │    analysis         │
│  • changes     │  │                 │  │                     │
│  • alerts      │  │                 │  │                     │
└────────────────┘  └────────┬────────┘  └─────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CELERY WORKERS                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Background Tasks:                                        │  │
│  │  • check_monitored_page    - Scrape and analyze page    │  │
│  │  • check_all_pages         - Periodic check trigger     │  │
│  │  • send_alert              - Send notifications         │  │
│  │  • retry_failed_alerts     - Retry failed sends         │  │
│  │  • cleanup_old_snapshots   - Remove old data            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CELERY BEAT                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Scheduler:                                               │  │
│  │  • Every 10 min   → check_all_monitored_pages           │  │
│  │  • Every 5 min    → retry_failed_alerts                 │  │
│  │  • Daily at 2 AM  → cleanup_old_snapshots               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
                   ┌─────────▼──────────┐
                   │  EXTERNAL SERVICES │
                   │                    │
                   │  • Slack Webhooks  │
                   │  • SMTP Email      │
                   └────────────────────┘
```

## Data Flow: Page Monitoring

```
┌───────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                 │
│    User adds monitored page via UI                            │
│    → POST /v1/pages {url, competitor_id, frequency}           │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. API VALIDATION                                              │
│    • Validate URL format                                       │
│    • Check competitor ownership                                │
│    • Verify organization limits                                │
│    • Create MonitoredPage in database                          │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. SCHEDULER (Celery Beat)                                     │
│    • Runs every 10 minutes                                     │
│    • Queries pages where next_check_at <= now                  │
│    • Queues check_monitored_page task for each page            │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. WORKER TASK (check_monitored_page)                          │
│    a) Scrape page with Playwright                             │
│       • Launch browser                                         │
│       • Navigate to URL                                        │
│       • Wait for network idle                                  │
│       • Extract HTML + visible text                            │
│       • Generate content hash                                  │
│                                                                │
│    b) Create snapshot                                          │
│       • Store raw_html, cleaned_text, hash                     │
│       • Save to database                                       │
│       • Update page.last_checked_at                            │
│                                                                │
│    c) Compare with previous snapshot                           │
│       • Query previous successful snapshot                     │
│       • Quick compare: content_hash                            │
│       • If different → proceed to analysis                     │
│       • If same → create "no change" event                     │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. LLM ANALYSIS (if content changed)                           │
│    a) Send to OpenAI                                           │
│       • Previous content                                       │
│       • Current content                                        │
│       • Page metadata (URL, type)                              │
│       • Prompt: "Analyze changes and output JSON"              │
│                                                                │
│    b) LLM Response                                             │
│       {                                                        │
│         "change_detected": true,                               │
│         "summary": "Pricing increased by 20%",                 │
│         "change_type": "pricing",                              │
│         "severity": "high",                                    │
│         "business_impact": "...",                              │
│         "recommended_action": "..."                            │
│       }                                                        │
│                                                                │
│    c) Rule-based overrides                                     │
│       • Check for price changes → elevate severity             │
│       • Check for percentage changes > 10% → elevate           │
│       • Check if legal/compliance page → elevate               │
│       • Set numeric severity_score (1-4)                       │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 6. CREATE CHANGE EVENT                                         │
│    • Store in change_events table                              │
│    • Link to snapshot and monitored_page                       │
│    • Save LLM response as JSON                                 │
│    • Set acknowledged = false                                  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 7. SEND ALERTS (if severity >= medium)                         │
│    a) Create alert records                                     │
│       • One for Slack (if configured)                          │
│       • One for Email (if configured)                          │
│       • Status = PENDING                                       │
│                                                                │
│    b) Send via AlertService                                    │
│       • Format message with all change details                 │
│       • POST to Slack webhook                                  │
│       • Send via SMTP to org contact email                     │
│       • Update alert.status = SENT                             │
│       • Set alert.sent_at timestamp                            │
│                                                                │
│    c) Retry logic (if failed)                                  │
│       • Set status = RETRY                                     │
│       • Increment retry_count                                  │
│       • Set next_retry_at = now + (5 * retry_count) minutes    │
│       • retry_failed_alerts task will retry later              │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────┐
│ 8. USER NOTIFICATION                                           │
│    • User receives Slack message                               │
│    • User receives email                                       │
│    • User logs in to dashboard                                 │
│    • Sees change in "Recent Changes" and Changes page          │
│    • Reviews details and acknowledges                          │
└───────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────┐
│   organizations         │
│─────────────────────────│
│ + id (PK)               │
│   name                  │
│   slug (unique)         │
│   is_active             │
│   max_competitors       │
│   max_monitored_pages   │
│   contact_email         │
│   created_at            │
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐     ┌─────────────────────────┐
│   users                 │     │   competitors           │
│─────────────────────────│     │─────────────────────────│
│ + id (PK)               │     │ + id (PK)               │
│   email (unique)        │     │   name                  │
│   hashed_password       │     │   domain                │
│   full_name             │     │   description           │
│   is_active             │     │   is_active             │
│   is_superuser          │     │ * organization_id (FK)  │
│ * organization_id (FK)  │     │   created_at            │
│   last_login            │     └───────────┬─────────────┘
│   created_at            │                 │
└─────────────────────────┘                 │ 1:N
                                            │
                             ┌──────────────▼──────────────┐
                             │   monitored_pages          │
                             │────────────────────────────│
                             │ + id (PK)                  │
                             │   url                      │
                             │   page_title               │
                             │   page_type                │
                             │   check_frequency          │
                             │   is_active                │
                             │ * competitor_id (FK)       │
                             │   last_checked_at          │
                             │   next_check_at            │
                             │   created_at               │
                             └──────────────┬─────────────┘
                                            │
                                            │ 1:N
                     ┌──────────────────────┴──────────────────────┐
                     │                                             │
          ┌──────────▼──────────┐                   ┌─────────────▼────────────┐
          │   snapshots         │                   │   change_events          │
          │─────────────────────│                   │──────────────────────────│
          │ + id (PK)           │                   │ + id (PK)                │
          │   raw_html          │                   │   change_detected        │
          │   cleaned_text      │                   │   summary                │
          │   page_title        │                   │   change_type            │
          │   http_status_code  │                   │   severity               │
          │   content_hash      │                   │   severity_score         │
          │   success           │                   │   business_impact        │
          │   error_message     │                   │   recommended_action     │
          │   load_time_ms      │                   │   llm_response (JSON)    │
          │ * monitored_page_id │◄──────┐           │   diff_preview           │
          │   created_at        │       │           │   acknowledged           │
          └─────────────────────┘       │           │ * monitored_page_id (FK) │
                                        │           │ * snapshot_id (FK)       │
                                        └───────────┤   created_at             │
                                                    └─────────────┬────────────┘
                                                                  │
                                                                  │ 1:N
                                                                  │
                                                    ┌─────────────▼────────────┐
                                                    │   alerts                 │
                                                    │──────────────────────────│
                                                    │ + id (PK)                │
                                                    │   channel (enum)         │
                                                    │   status (enum)          │
                                                    │   recipient              │
                                                    │   subject                │
                                                    │   message                │
                                                    │   sent_at                │
                                                    │   error_message          │
                                                    │   retry_count            │
                                                    │ * change_event_id (FK)   │
                                                    │   created_at             │
                                                    └──────────────────────────┘
```

## Technology Stack Details

### Backend Stack

```
FastAPI Framework
├── Uvicorn (ASGI server)
├── Pydantic (validation)
└── Starlette (web framework)

Database Layer
├── SQLAlchemy (ORM)
├── Alembic (migrations)
└── PostgreSQL (database)

Background Jobs
├── Celery (task queue)
├── Redis (broker & backend)
└── Crontab schedules

Web Scraping
├── Playwright (browser automation)
├── BeautifulSoup4 (HTML parsing)
└── Chromium browser

AI/LLM
└── OpenAI API (GPT-4 Turbo)

Security
├── python-jose (JWT)
├── passlib (password hashing)
└── Bcrypt algorithm

Notifications
├── httpx (Slack webhooks)
└── aiosmtplib (email)
```

### Frontend Stack

```
Next.js 14
├── React 18
├── App Router
└── Server Components

TypeScript
├── Type safety
└── IntelliSense

Styling
├── Tailwind CSS
├── PostCSS
└── Autoprefixer

HTTP Client
└── Axios

Icons
└── React Icons

Date Handling
└── date-fns
```

### Infrastructure Stack

```
Containerization
├── Docker
└── Docker Compose

Services
├── PostgreSQL 15
├── Redis 7
├── Python 3.11
└── Node 20

Networking
└── Bridge network

Volumes
├── postgres_data
└── redis_data
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS (in production)
                       │ JWT Token in Authorization header
                       │
┌──────────────────────▼──────────────────────────────────┐
│              AUTHENTICATION LAYER                        │
│  • JWT token validation                                  │
│  • Token expiration check                                │
│  • User lookup and verification                          │
│  • Organization context injection                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              AUTHORIZATION LAYER                         │
│  • Organization-based data isolation                     │
│  • User permission checks                                │
│  • Resource ownership validation                         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              VALIDATION LAYER                            │
│  • URL format validation                                 │
│  • Email format validation                               │
│  • Password strength validation                          │
│  • Input sanitization                                    │
│  • SQL injection prevention (ORM)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              DATA LAYER                                  │
│  • Parameterized queries (SQLAlchemy)                    │
│  • Password hashing (Bcrypt)                             │
│  • Secure storage                                        │
└──────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Production)

```
                    ┌──────────────────┐
                    │   CLOUDFLARE     │
                    │   (CDN + WAF)    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  LOAD BALANCER   │
                    │   (ALB/nginx)    │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │  FRONTEND   │          │  BACKEND    │
         │  (Next.js)  │          │  (FastAPI)  │
         │  Container  │          │  Container  │
         │  x N        │          │  x N        │
         └─────────────┘          └──────┬──────┘
                                         │
                    ┌────────────────────┴────────────────┐
                    │                                     │
         ┌──────────▼─────────┐              ┌──────────▼─────────┐
         │  MANAGED POSTGRES  │              │  MANAGED REDIS     │
         │  (RDS/Cloud SQL)   │              │  (ElastiCache)     │
         └────────────────────┘              └────────────────────┘
                                                         │
                                              ┌──────────▼─────────┐
                                              │  CELERY WORKERS    │
                                              │  Auto-scaling      │
                                              └────────────────────┘
```

This architecture ensures:
- **High availability** through load balancing
- **Scalability** through horizontal scaling
- **Security** through multiple layers
- **Performance** through caching and CDN
- **Reliability** through managed services

---

**For more details, see:**
- [README.md](README.md) - Main documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Setup instructions
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
