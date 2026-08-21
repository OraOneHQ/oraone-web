# OraOne Documentation

The canonical documentation set for running, integrating with, and operating
OraOne in production. One focused doc per concern, diagram-first.

| Guide | What it covers |
|-------|----------------|
| [Architecture](ARCHITECTURE.md) | Top-level system overview, trust boundaries, security posture, and what's deliberately deferred — the one diagram to start with. |
| [Features](FEATURES.md) | Key features, product structure (Organization → Project → Agent), built-in support/onboarding, and plans & limits. |
| [UML Diagrams](UML.md) | Use-case, class, and sequence diagrams for every major flow (auth, chat, knowledge, widgets, webhooks). |
| [Frontend](FRONTEND.md) | React/CRA architecture, directory structure, GitHub Pages routing, and brand identity. |
| [Backend](BACKEND.md) | FastAPI request lifecycle, middleware, auth flows, chat system, webhooks, and the public REST API (`/api/v1`). |
| [Database](DATABASE.md) | PostgreSQL schema (ER diagram + core table fields) and Redis usage/failure semantics. |
| [Deployment](DEPLOYMENT.md) | The two deployment topologies, CI/CD, health checks, incident response, backups, and scaling. |
| [Routes](ROUTES.md) | Every front-end route, grouped by area, with auth requirements. |
| [Environment Variables](ENVIRONMENT.md) | Every backend env var, whether required, and safe defaults. |
| [Local Setup](../LOCAL_SETUP.md) | Running the full stack locally (Postgres/Redis/MinIO via Docker, self-hosted auth — no AWS account required). |

## Where to start

- **Building a feature?** [Architecture](ARCHITECTURE.md) → the specific
  [Frontend](FRONTEND.md)/[Backend](BACKEND.md)/[Database](DATABASE.md) doc.
- **Integrating with the API?** [Backend → Public API](BACKEND.md#public-api).
- **Deploying or on-call?** [Deployment](DEPLOYMENT.md).
- **Adding/removing a page?** Update [Routes](ROUTES.md).
- **Adding a config knob?** Update [Environment](ENVIRONMENT.md) and
  `backend/.env.example` together.

> Conventions: keep this set accurate. When a feature ships, update
> [Features](FEATURES.md) and, if it adds endpoints, [Backend](BACKEND.md).
> When a route is added/removed/redirected, update [Routes](ROUTES.md).
> When a config knob is added, update [Environment](ENVIRONMENT.md).
