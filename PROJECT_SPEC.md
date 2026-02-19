You are a senior full-stack architect building a production-ready SaaS MVP called:

"ChangeSignal AI"
🎯 Product Goal

Build an autonomous web intelligence platform that:

Monitors competitor websites

Detects semantic (meaning-based) changes

Classifies severity

Explains business impact

Suggests recommended actions

Sends alerts via Slack and email

Stores historical snapshots for comparison

This is NOT a simple diff tool.
This must include LLM-based reasoning.

🏗️ Tech Stack Requirements

Backend:

Python

FastAPI

PostgreSQL

SQLAlchemy

Alembic

Playwright (for browser automation)

OpenAI API (LLM)

Celery or BackgroundTasks for scheduled checks

Redis (for job queue)

Frontend:

Next.js (App Router)

Tailwind CSS

Simple dashboard

Auth (JWT-based)

Axios for API calls

Infra:

Docker + Docker Compose

.env config

Modular structure

Production-ready folder structure

📦 Core Features to Implement
1️⃣ User System

Register / Login

JWT authentication

Organization-based accounts

Multi-user support per org

2️⃣ Website Monitoring

Users can:

Add competitor

Add URLs to monitor

Set monitoring frequency (daily/hourly)

Store:

Raw HTML snapshot

Cleaned text version

Timestamp

Use Playwright to:

Handle JS-heavy sites

Wait for network idle

Extract visible content only

3️⃣ Snapshot Comparison Engine

When new snapshot is captured:

Retrieve previous snapshot

Generate structured diff prompt to LLM:

LLM must output JSON:

{
"change_detected": true/false,
"summary": "",
"change_type": "pricing|features|policy|content|layout|other",
"severity": "low|medium|high|critical",
"business_impact": "",
"recommended_action": ""
}

Use temperature 0.2 for consistency.

4️⃣ Impact Scoring Logic (Python Layer)

Add rule-based overrides:

If price numbers change → at least medium

If % change > 10% → high

If “Terms”, “Compliance”, “Legal” page changes → high

Store severity_score as numeric (1–4).

5️⃣ Alerts

If severity >= medium:

Send Slack webhook

Send email via SMTP

Slack message format:

🚨 Change Detected
Company:
Page:
Severity:
Summary:
Impact:
Recommended Action:

6️⃣ Dashboard (Next.js)

Pages:

Login/Register

Dashboard

Add Competitor

View Monitoring List

Change History Timeline

Severity filter

Detail page per change

UI should be clean SaaS style.

7️⃣ Database Schema

Tables:

users
organizations
competitors
monitored_pages
snapshots
change_events
alerts

Include proper foreign keys and indexing.

8️⃣ Background Jobs

Use Celery + Redis.

Scheduler:

Cron-like periodic tasks

Each monitored_page triggers:
fetch → compare → store → alert

9️⃣ Folder Structure

Backend:

backend/
  app/
    api/
    core/
    models/
    services/
    workers/
    utils/
  main.py
  Dockerfile


Frontend:

frontend/
  app/
  components/
  lib/
  hooks/
  Dockerfile

🔐 Security Requirements

Validate URLs before monitoring

Rate limiting

Error handling

Retry failed jobs

Sanitize HTML input

📊 Bonus (If time allows)

Vector DB (pgvector) for semantic memory

Change trend analysis

Weekly summary email

Export to CSV

⚠️ Important Engineering Constraints

Code must be modular and clean

No pseudo code

No placeholders

Working API routes

Proper environment variables

Proper error handling

Fully runnable with docker-compose up

🎯 Deliverable

Generate the entire MVP in structured steps:

Backend scaffold

Database models

Monitoring service

LLM diff service

Celery setup

API routes

Frontend scaffold

Docker compose file

README with setup instructions

Do NOT skip implementation details.