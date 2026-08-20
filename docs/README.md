# OraOne Documentation

The canonical documentation set for running, integrating with, and operating
OraOne in production.

## For customers & integrators

| Guide | What it covers |
|-------|----------------|
| [Product Guide](PRODUCT_GUIDE.md) | Every product surface: agents, knowledge bases, widgets, the Customer Portal, onboarding, changelog, status and feedback. |
| [API Reference](API_REFERENCE.md) | The public REST API (`/api/v1`): authentication, endpoints, errors and rate limits. |
| [Plans & Limits](PLANS_AND_LIMITS.md) | Plan tiers, usage quotas and API rate limits, and what happens when a limit is hit. |

## For operators & deployers

| Guide | What it covers |
|-------|----------------|
| [Architecture](ARCHITECTURE.md) | System, frontend, backend, Redis, database, auth, security, deployment and observability — with diagrams. |
| [Environment Variables](ENVIRONMENT.md) | Every environment variable the backend reads, whether it is required, and safe defaults. |
| [Operations Runbook](OPERATIONS_RUNBOOK.md) | Health checks, the status page, monitoring, incident response, backups and scaling. |
| [Launch Test Report](LAUNCH_TEST_REPORT.md) | Functional + security test results and the OWASP Top 10 posture (no load testing). |
| [Database Setup](../DATABASE_SETUP.md) | Postgres + Alembic migrations. |
| [Deployment Verification](../DEPLOYMENT_VERIFICATION.md) | Post-deploy smoke checks. |
| [Local Setup](../LOCAL_SETUP.md) | Running the full stack locally (Postgres/Redis via Docker, no AWS required except for the currently-offline Cognito auth). |

## Architecture at a glance

- **Frontend** — Create React App (CRA + CRACO), deployed as a static build to **GitHub Pages** (`oraone.in`). Marketing site + authenticated dashboard (`/app/*`).
- **Backend** — FastAPI (`backend/server.py`) exposing the dashboard API, the public API (`/api/v1`), and the public widget API (`/api/widget/*`). Not currently deployed anywhere — see [Architecture §6](ARCHITECTURE.md#6-deployment).
- **Database** — PostgreSQL (async SQLAlchemy + Alembic). pgvector for embeddings.
- **Cache** — Redis-ready (`app/services/cache.py`), falls back to in-process when unavailable.
- **Identity** — AWS Cognito (JWT). **Currently offline** — the AWS account was closed; see [Architecture §3.3](ARCHITECTURE.md#33-authentication--authorization).
- **Storage** — S3 or any S3-compatible provider in production, local filesystem fallback for development.
- **AI** — Pluggable provider (OpenRouter / OpenAI-compatible, optional AWS Bedrock). Falls back to extractive answers when no provider is configured.

> Conventions: keep this set accurate. When a feature ships, update the
> [Product Guide](PRODUCT_GUIDE.md) and, if it adds endpoints, the
> [API Reference](API_REFERENCE.md). When a config knob is added, update
> [Environment Variables](ENVIRONMENT.md).
