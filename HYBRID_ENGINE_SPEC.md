You are a senior backend systems architect.

Upgrade my existing ChangeSignal AI backend to implement a production-grade Hybrid Website Monitoring Engine using:

- Python
- FastAPI
- Celery + Redis
- PostgreSQL
- BeautifulSoup
- aiohttp
- Playwright (fallback only)
- Groq API (Llama 3 models ONLY)

This system must minimize LLM usage by using deterministic extraction first and only calling Groq when necessary.

==================================================
CORE PRINCIPLE
==================================================

DO NOT send full HTML to the LLM.
Use deterministic extraction + structured diff first.
Only send reduced structured fragments to Groq if confidence is low.

==================================================
ARCHITECTURE TO IMPLEMENT
==================================================

Stage 1 — Concurrent Fetch Layer
Stage 2 — Deterministic Extraction
Stage 3 — Structured Diff Engine
Stage 4 — Confidence Router
Stage 5 — Groq Semantic Analysis (only if required)
Stage 6 — Store + Alert

==================================================
STAGE 1 — FETCH LAYER
==================================================

Create: backend/app/services/fetcher.py

Requirements:
- asyncio + aiohttp
- Max 15 concurrent requests using Semaphore
- Timeout handling (10 seconds)
- Retry with exponential backoff
- User-agent header
- Optional Playwright fallback for JS-heavy pages

Functions:
- async fetch_page(url)
- async fetch_with_playwright(url)
- async batch_fetch(urls)

==================================================
STAGE 2 — DETERMINISTIC EXTRACTION
==================================================

Create: backend/app/services/extractor.py

Use BeautifulSoup.

Remove:
- script
- style
- nav
- footer

Extract structured signals:

1) Pricing
Regex:
r"\$?\d+(?:,\d{3})*(?:\.\d{2})?"

Detect:
- currency
- percentages
- plan names
- billing terms

2) Headings (h1–h4)

3) Feature lists (ul/li blocks)

4) Tables

Return structured JSON:

{
  "pricing": [...],
  "headings": [...],
  "features": [...],
  "tables": [...],
  "clean_text": "..."
}

Extraction must be under 50ms.

==================================================
STAGE 3 — DETERMINISTIC DIFF ENGINE
==================================================

Create: backend/app/services/diff_engine.py

Compare previous structured snapshot with new snapshot.

Detect:
- Price change
- New plan
- Removed feature
- Heading changes
- Table modifications

Assign severity deterministically:

Rules:
- Price increase >10% → HIGH
- New plan → MEDIUM
- Legal/policy page change → HIGH
- Minor heading change → LOW

Return:

{
  "change_detected": true,
  "requires_llm": false,
  "confidence": 0.85,
  "structured_changes": {...},
  "severity": "low|medium|high|critical"
}

==================================================
STAGE 4 — CONFIDENCE ROUTER
==================================================

Create: backend/app/services/router.py

Logic:

If:
- No structured pricing but large text diff
- Content difference ratio > 30%
- Significant semantic heading shift
- Deterministic confidence < 0.7

Then:
requires_llm = True

Else:
requires_llm = False

Threshold configurable.

==================================================
STAGE 5 — GROQ LLM ENGINE
==================================================

Create: backend/app/services/groq_engine.py

Use Groq SDK.

Model:
- "llama3-8b-8192"
- Optional upgrade: "llama3-70b-8192"

Temperature: 0.1
Force JSON response.

NEVER send full HTML.
Send only:
- structured summary
- changed text blocks
- max 800 tokens

SYSTEM PROMPT:

"You are a competitive intelligence analyst.
Analyze website change fragments.
Return only valid JSON.
No markdown.
No explanations.
Do not hallucinate.
Base conclusions only on provided content."

USER PROMPT TEMPLATE:

Previous structured summary:
{previous_structured_summary}

New structured summary:
{new_structured_summary}

Changed text blocks:
{changed_fragments}

Return JSON:

{
  "change_detected": true/false,
  "change_type": "pricing|features|policy|positioning|content|other",
  "severity": "low|medium|high|critical",
  "business_impact": "",
  "recommended_action": "",
  "confidence": 0.0
}

==================================================
STAGE 6 — DATABASE UPDATES
==================================================

Update change_events table:

Add columns:
- structured_diff JSONB
- llm_analysis JSONB
- requires_llm BOOLEAN
- severity_score INTEGER
- confidence FLOAT

Index:
- severity_score
- created_at

==================================================
CELERY WORKER FLOW
==================================================

Update monitor_worker.py:

Flow:

1. Fetch page
2. Extract structured signals
3. Compare with last snapshot
4. Run deterministic diff
5. If requires_llm:
      Call Groq
6. Merge results
7. Store change_event
8. Trigger alert if severity >= medium

==================================================
PERFORMANCE TARGETS
==================================================

- Fetch: 1–2 sec
- Extraction: < 50ms
- Diff: < 10ms
- Groq call: 300–800ms
- 60–80% LLM call reduction
- Skip LLM entirely for well-structured pricing pages

==================================================
ENGINEERING REQUIREMENTS
==================================================

- Modular clean code
- Full implementations (no pseudocode)
- Proper error handling
- Logging
- Configurable thresholds
- Environment variables for Groq API key
- Fully runnable with docker-compose

==================================================
DELIVERABLE
==================================================

Generate:

1. All service modules implemented
2. Updated Celery worker
3. Database migration
4. Example monitoring job
5. Unit tests for:
   - pricing extraction
   - deterministic diff
   - router logic
6. README update explaining hybrid architecture

Do not generate placeholders.
Do not skip implementation details.
Implement step by step starting with fetcher.py.
