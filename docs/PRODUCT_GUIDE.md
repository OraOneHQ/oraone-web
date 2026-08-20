# OraOne Product Guide

A tour of every product surface, including how the pieces fit together for a
production launch. Routes in **bold** are in the authenticated dashboard under
`/app`.

---

## 1. Workspaces, projects & agents

OraOne is organised as **Organization → Project → Agent**.

- An **organization** is your company/workspace. Every user belongs to one org.
- A **project** groups agents, knowledge and channels. The active project is sent
  to the API via the `X-Project-Id` header.
- An **agent** is an AI assistant for a channel — **Chat** or
  **WhatsApp** — backed by one or more knowledge bases.

Create and manage agents in **Agents** (`/app/agents`).

## 2. Knowledge bases

A knowledge base is the source of truth an agent answers from. Upload PDFs,
FAQs, and docs; OraOne chunks and embeds them (pgvector) and retrieves the most
relevant passages at answer time, with scored citations.

Manage in **Knowledge** (`/app/knowledge`). If no AI provider is configured, the
agent still answers using grounded extractive snippets from your sources.

## 3. Chat widget

Publish an agent as an embeddable chat widget — a single JS snippet that works
on React, Next.js, WordPress and Shopify. Each widget has a public key and is
served from the widget API (`/api/widget/*`).

- Configure & publish in **Widgets** (`/app/widgets`).
- Visitors get sessions, messages, lead capture, and escalation.

### Customer feedback on answers

Every AI answer in the widget shows 👍 / 👎 controls. Feedback is recorded via
`POST /api/widget/feedback` (👍 = rating 5, 👎 = rating 1) so you can measure
answer quality over time.

## 4. The OraOne AI support assistant

OraOne ships with its own support assistant — a dedicated project, knowledge
base (7 categories: getting started, agents, knowledge, widgets, billing, API,
troubleshooting) and published widget. It appears as a launcher inside the
dashboard. Trigger it from anywhere with the `oraone:open-support` window event:

```js
window.dispatchEvent(new CustomEvent("oraone:open-support"));
```

## 5. Customer Portal

**Portal** (`/app/portal`) is the customer hub. It shows:

- A personalised welcome.
- A plan + usage snapshot (from `GET /api/usage`).
- Quick actions: Support, Docs, Getting Started, Developers, Status, Changelog,
  Feature Requests and Billing.
- A **Get help** button that opens the support assistant.

## 6. Guided onboarding

**Getting Started** (`/app/getting-started`) is a live checklist that reflects
the real state of the account. It checks, in parallel, whether the org has a
project, an agent, knowledge, a published widget, a test conversation and an
invited teammate (optional). Each step deep-links to where the work happens and
shows a progress bar and **Done** badges.

## 7. Changelog & product status

- **Changelog** (`/app/changelog`) — release notes by version.
- **Status** (`/app/status`) — live system status driven by `GET /api/health`
  and `GET /api/health/db`, polled every 30s. Shows an overall banner and
  per-component health with latencies.

## 8. Feature requests & bug reports

**Feature Requests** (`/app/feature-requests`) lets customers submit ideas and
bug reports, vote on them, and track status (`submitted → planned → in_progress
→ shipped`). Backed by `/api/feature-requests` with create, vote-toggle, status
and stats endpoints.

## 9. Developers & API keys

**Developers** (`/app/developers`) is the in-app API console:

- Quickstart cards and copy-paste cURL / JavaScript / Python samples.
- An interactive **Try it** runner on read-only endpoints (live JSON inline).
- A ping/chat playground.
- API key management (create keys with scoped permissions).
- A link to the OpenAPI schema.

See the [API Reference](API_REFERENCE.md) for the full endpoint list.

## 10. Plans, usage & billing

Plans gate both **resource limits** (agents, knowledge bases, seats, workflows,
integrations) and **rate limits** (API requests/minute, daily AI messages). See
[Plans & Limits](PLANS_AND_LIMITS.md). Usage is visible in **Portal** and the
usage panel; billing/upgrade flows live under Settings.

## 11. Team

Invite teammates and assign roles (owner, admin, member) in **Team**
(`/app/team`). Seat counts are enforced against the plan.

---

## Where company-level pages live

The left sidebar is **project-scoped** by design. Company-level surfaces
(Portal, Getting Started, Changelog, Status, Feature Requests) are reachable
from the **Settings** hub, the **profile menu**, and direct `/app/*` routes.
