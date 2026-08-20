# OraOne Documentation

The canonical documentation set for running, integrating with, and operating
OraOne in production.

## For customers & integrators

| Guide | What it covers |
|-------|----------------|
| [Product Guide](PRODUCT_GUIDE.md) | Every product surface: agents, knowledge bases, widgets, the Customer Portal, onboarding, changelog, status and feedback. |
| [Pages & Routes](PAGES_AND_ROUTES.md) | Every front-end route, grouped by area, with auth requirements. |
| [API Reference](API_REFERENCE.md) | The public REST API (`/api/v1`): authentication, endpoints, errors and rate limits. |
| [Plans & Limits](PLANS_AND_LIMITS.md) | Plan tiers, usage quotas and API rate limits, and what happens when a limit is hit. |

## For operators & deployers

| Guide | What it covers |
|-------|----------------|
| [Architecture](ARCHITECTURE.md) | System, frontend, backend, Redis, database, auth, security, deployment and observability — with diagrams. |
| [Architecture Baseline](ARCHITECTURE_BASELINE.md) | Tool-verified snapshot of the codebase as it exists today — dependency map + roadmap. |
| [Environment Variables](ENVIRONMENT.md) | Every environment variable the backend reads, whether it is required, and safe defaults. |
| [Operations Runbook](OPERATIONS_RUNBOOK.md) | Health checks, the status page, monitoring, incident response, backups and scaling. |
| [Launch Test Report](LAUNCH_TEST_REPORT.md) | Functional + security test results and the OWASP Top 10 posture (no load testing). |
| [Local Setup](../LOCAL_SETUP.md) | Running the full stack locally (Postgres/Redis/MinIO via Docker, self-hosted auth — no AWS account required). |

## Architecture at a glance

- **Frontend** — Create React App (CRA + CRACO), deployed as a static build to **GitHub Pages** (`oraone.in` / `www.oraone.in`, HTTPS enforced). Marketing site + authenticated dashboard (`/app/*`) + Super Admin Control Center (`/admin/*`).
- **Backend** — FastAPI (`backend/server.py`) exposing the dashboard API, the public API (`/api/v1`), and the public widget API (`/api/widget/*`). Runs under Gunicorn + Uvicorn workers in production (`backend/Dockerfile`, `backend/gunicorn.conf.py`).
- **Database** — PostgreSQL (async SQLAlchemy + Alembic). pgvector for embeddings.
- **Cache** — Redis-backed (`app/services/cache.py`) for idempotency, rate limiting, and refresh-token storage; falls back to in-process when unavailable.
- **Identity** — Self-hosted (Argon2 password hashing + JWT access/refresh tokens, `app/services/auth_service.py`). Bearer tokens + httpOnly/SameSite cookies, no external identity provider.
- **Storage** — S3 or any S3-compatible provider (MinIO included in the Docker stack), local filesystem fallback for development.
- **AI** — Pluggable provider (OpenRouter / OpenAI-compatible, optional AWS Bedrock embeddings). Falls back to extractive answers when no provider is configured.

> Conventions: keep this set accurate. When a feature ships, update the
> [Product Guide](PRODUCT_GUIDE.md) and, if it adds endpoints, the
> [API Reference](API_REFERENCE.md). When a route is added/removed/redirected,
> update [Pages & Routes](PAGES_AND_ROUTES.md). When a config knob is added,
> update [Environment Variables](ENVIRONMENT.md).
