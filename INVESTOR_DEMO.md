# Investor Demo Guide – ChangeSignal AI

This doc helps you present ChangeSignal AI to investors and assess readiness for funding conversations.

---

## Is the app demoable?

**Yes.** The product is demoable as a working SaaS MVP:

- **Landing page**: Clear value prop, use cases (business owners, product teams, enterprises), testimonials, pricing, and CTAs.
- **Product flow**: Sign up → Add competitors → Add monitored pages → See changes with AI analysis → Export reports / Executive summary.
- **Polish**: Dark/light theme, responsive UI, Terms & Privacy placeholders, favicon, and consistent subscription messaging (Free Trial / Pro Plan).

---

## Pre-demo checklist

Before a call or in-person demo:

| Item | Status |
|------|--------|
| All services running (`docker compose up -d`, migrations applied) | ☐ |
| OpenAI API key set in `.env` (needed for AI analysis) | ☐ |
| Test account created; can log in and see dashboard | ☐ |
| At least 1–2 competitors and 1–2 monitored pages added | ☐ |
| Optional: Trigger a check so at least one “change” appears (or use existing data) | ☐ |
| Browser: hard refresh so latest frontend (and favicon) loads | ☐ |

---

## Suggested 5–7 minute demo script

1. **Landing (1 min)**  
   Show homepage: “Stay ahead of the competition,” who it’s for, key features, pricing. Scroll to pricing and mention Free Trial + Pro Plan. Click **Get Started** (or **Sign In** if already signed up).

2. **Dashboard (1 min)**  
   “After signup you land here.” Point out: Intelligence Dashboard, key metrics (changes, severity), Recent Activity, and **Executive Report** as the one-pager for leadership.

3. **Competitors + Compare (1 min)**  
   Open **Competitors** → show list and “Add competitor.” Open **Compare** → “Side-by-side view of who we monitor and how active they are.”

4. **Monitoring (1 min)**  
   Open **Monitoring** → “We track specific pages—pricing, features, etc.—on a schedule. Here’s where we add URLs and set frequency.”

5. **Changes + AI value (2 min)**  
   Open **Changes** → “When something changes, we don’t just show a diff. The AI classifies severity, summarizes what changed, explains business impact, and suggests actions.” Open one change and walk through: summary, “What changed,” Business impact, Recommended action. Mention **Export CSV** and **Report** for sharing with execs.

6. **Closing (30 sec)**  
   “We’re built for business owners and teams who need to react fast to competitor moves. Free trial to start, Pro Plan for scale. We can go deeper on technical architecture or go-to-market next.”

---

## What strengthens the story for funding

- **Already done**: Working product, clear positioning, pricing, landing + app polish, executive report, comparison matrix, export, trial/subscription flow, admin config.
- **Worth adding before or during raise**:
  - **Traction**: Even a few pilot users or LOIs; usage stats in admin/dashboard if you have them.
  - **Legal**: Replace Terms/Privacy placeholders with lawyer-drafted versions before or right after first checks.
  - **Security/compliance**: One-pager or slide on data handling, auth, and “SOC 2 / enterprise-ready” roadmap if relevant.
  - **Roadmap**: Short slide or doc on next 6–12 months (e.g. more integrations, enterprise features, sales motion).

---

## Quick “what we built” for investors

- **Problem**: Teams miss competitor moves (pricing, features, messaging) until it’s too late.
- **Solution**: Automated monitoring + AI that explains what changed and why it matters.
- **Differentiation**: Semantic AI analysis and business impact, not just diff alerts.
- **Business model**: Free Trial → Pro Plan (subscription); admin-configurable trial length and price.
- **Tech**: FastAPI, Next.js, PostgreSQL, Redis, Celery, Playwright, OpenAI. Docker-based deployment.

Use this guide to run a tight, repeatable demo and to answer “Is this demoable and what else should we do?” with confidence.
