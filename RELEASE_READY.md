# OraOne — R1–R10 Release Notes

**Status:** ✅ Release Ready
**Scope:** R1 (Enterprise Chat) + R2 (Enterprise Knowledge Base) + R3 (Website Crawling Engine) + R4 (Enterprise RAG Engine) + R5 (Integrations Platform) + R6 (Embedded Website Widget) + R7 (Developer Platform / Public API & Webhooks) + R8 (Enterprise Analytics & Observability) + R9 (Enterprise Team Collaboration) + R10 (Enterprise Security & Release Readiness)
**Migrations:** through `0023_collaboration_security` (head)
**Backend routes:** 250+ (R9 adds 20 collaboration endpoints; R10 adds 16 security/operations endpoints)

These releases extend the existing OraOne platform with enterprise-grade
conversation management, a full-featured knowledge base, an autonomous website
crawling engine, a hybrid (vector + full-text) RAG engine, a third-party
**integrations platform**, an **embeddable website chat widget**, a
**developer platform** (versioned public REST API, scoped API keys, signed
webhooks, plan-based rate limiting, idempotency, request logs), an
**enterprise analytics & observability** suite (10+ analytics modules, AI cost
accounting, ROI/savings, CSV export), an **enterprise team collaboration**
workspace (teams, resource sharing/ACL, comments, mentions, reactions,
notifications, activity feed, tasks, follows), and an **enterprise security &
release-readiness** layer (PII detection/masking, prompt-injection protection,
content moderation, output validation, security events, audit trail, system
health/metrics, release readiness, feature flags, deployment history). All
backend endpoints were verified end-to-end; the frontend compiles cleanly and
surfaces every new capability. AI-dependent features (summaries, suggested
questions, regeneration, grounded answers) **degrade gracefully** to
deterministic fallbacks when the AI provider is unavailable.

---

## R1 — Enterprise Chat Experience

### Highlights
- **Rich Markdown rendering** of assistant replies (headings, bold/italic,
  inline + fenced code, ordered/unordered lists, links) — dependency-free,
  no `dangerouslySetInnerHTML`.
- **Conversation organization**: pin, favorite, archive, tag, and group into
  custom **folders** (per user, per organization).
- **Search & filter**: full-text search across conversation titles and message
  content; filter tabs for All / Favorites / Archived.
- **Export**: download any conversation as **Markdown** or **JSON**.
- **Share / public view**: generate a public share link; a read-only transcript
  is served at `/share/:token` with no authentication required.
- **Regenerate**: re-run the last assistant response.
- **Suggested follow-up questions**: surfaced as one-click chips (deterministic
  fallback when AI is offline).

### New / changed API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/conversations` | list with `folder_id`, `q`, `archived`, `favorite`, `pinned` filters; pinned sorted first |
| PATCH | `/conversations/{id}` | update title / pin / archive / favorite / folder / tags / status |
| GET | `/conversations/{id}/export?format=markdown\|json` | export transcript |
| POST | `/conversations/{id}/share` | enable public share, returns token |
| DELETE | `/conversations/{id}/share` | disable public share |
| GET | `/conversations/{id}/suggested-questions` | suggested follow-ups (fallback-safe) |
| POST | `/conversations/{id}/regenerate?use_knowledge=` | regenerate last reply |
| GET/POST/PUT/DELETE | `/conversation-folders` | folder CRUD (org + user scoped) |
| GET | `/public/conversations/{token}` | **public, no-auth** read-only transcript |

### Data model
- New table **`conversation_folders`** (`organization_id`, `user_id`, `name`,
  `color`, `icon`).
- **`conversations`** extended: `is_pinned`, `is_archived`, `is_favorite`,
  `folder_id`, `tags` (JSONB), `share_token` (unique), `shared_at`.
- Migration: `20260702_0018_chat_organization`.

### Frontend
- `frontend/src/pages/dashboard/Chat.jsx` — markdown renderer, sidebar search +
  filter tabs, pinned grouping, per-row action menu (pin / favorite / archive /
  share / export / delete), header quick actions, suggested-question chips,
  regenerate button.
- `frontend/src/pages/public/SharedConversation.jsx` — public transcript page.
- Route `\/share\/:token` registered in `frontend/src/App.js` (outside the
  authenticated layout).

---

## R2 — Enterprise Knowledge Base

### Highlights
- **More file types**: added extractors for **XLSX/XLSM**, **PPTX**, **JSON**,
  and **HTML** (on top of existing PDF/DOCX/TXT/MD/CSV).
- **Deduplication**: identical content (SHA-256 checksum) in the same knowledge
  base is skipped instead of re-ingested.
- **Versioning**: re-uploading the same filename with different content snapshots
  the previous version and bumps the document version.
- **Folders**: organize documents into (optionally nested) folders.
- **Tags**: per-document tags, editable inline.
- **Auto summary + suggested questions**: deterministic enrichment computed at
  ingest time (AI-independent).
- **Knowledge search**: semantic/keyword search across a knowledge base.
- **Document preview**: summary, suggested questions, tags, metadata
  (pages / words / chunks / characters), excerpt, and version history.
- **Bulk actions**: select multiple documents → move, tag, reprocess, or delete.

### New / changed API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/documents/upload` | now accepts `folder_id`; computes checksum; dedup + versioning |
| GET/POST/PUT/DELETE | `/knowledge-folders` | folder CRUD (delete detaches docs, reparents children) |
| PATCH | `/documents/{id}` | move folder / clear folder / set tags |
| POST | `/documents/bulk` | `delete` \| `move` \| `tag` \| `reprocess` |
| GET | `/documents/{id}/preview` | summary + suggested questions + excerpt + metadata |
| GET | `/documents/{id}/versions` | version history |
| POST | `/knowledge/search` | search chunks across a knowledge base |

### Data model
- New table **`knowledge_folders`** (`knowledge_base_id`, `organization_id`,
  `parent_folder_id` (self-FK, nullable), `name`, `color`).
- New table **`document_versions`** (`document_id`, `organization_id`,
  `version`, `s3_key`, `checksum`, `file_size`, `filename`).
- **`documents`** extended: `folder_id`, `checksum`, `version`, `summary`,
  `suggested_questions` (JSONB), `tags` (JSONB), `doc_metadata` (JSONB).
- Migration: `20260703_0019_knowledge_organization`.

### Document processing (`backend/app/services/document_processing.py`)
- New extractors: `_extract_xlsx` (openpyxl, one page per sheet),
  `_extract_pptx` (python-pptx, one page per slide), `_extract_json`
  (flattened `path: value` lines), `_extract_html` (stdlib `HTMLParser`,
  drops `<script>`/`<style>`, title → section).
- New enrichment helpers: `compute_checksum`, `summarize_text` (extractive),
  `derive_questions` (section headings + top keywords).
- Pipeline best-effort sets `checksum`, `summary`, `suggested_questions`,
  `doc_metadata`.

### Dependencies
- Added `openpyxl>=3.1,<4.0` and `python-pptx>=0.6,<1.1` to
  `backend/requirements.txt`.

### Frontend
- `frontend/src/pages/dashboard/KnowledgeBaseDetails.jsx` — folders sidebar
  (All / Unfiled / custom, with counts + rename/delete), folder-scoped uploads,
  knowledge search bar with results, bulk select + action bar (move / tag /
  reprocess / delete), inline tag chips, and a preview drawer (summary,
  suggested questions, editable tags, metadata stats, excerpt, version history).
  Uploader accepts `.pdf,.docx,.txt,.md,.markdown,.csv,.xlsx,.xlsm,.pptx,.json,.html,.htm`.

---

## R3 — Enterprise Website Crawling Engine

### Highlights
- **Crawl any website into searchable knowledge** — pages are extracted to
  Markdown, chunked, embedded (Titan v2, 1024-dim), and stored alongside
  documents so the **same RAG plumbing** serves both sources.
- **Four crawl scopes**: `entire` site (BFS within domain), `single` page,
  `folder`/path-scoped, and `sitemap`-driven.
- **SSRF-hardened**: `validate_url` rejects private, loopback, link-local and
  reserved IP ranges (resolved via `socket` + `ipaddress`) before any fetch.
- **robots.txt aware** (opt-in per site), configurable `max_depth` / `max_pages`.
- **Change detection**: per-page SHA-256 checksum skips unchanged pages on
  recrawl; removed pages are soft-marked `deleted` and their chunks pruned.
- **Scheduling**: `manual` / `hourly` / `daily` / `weekly` / `monthly`, with
  `next_crawl_at` computed on completion.
- **Background execution**: crawls run via `BackgroundTasks` on their own DB
  session; live job state, per-URL logs, and analytics are queryable.
- **Dependency-free crawler**: `httpx` + stdlib `HTMLParser` only (no headless
  browser); `<nav>/<header>/<footer>/<script>/<style>` stripped, title captured.

### New / changed API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/websites?start=` | create a website (validates URL); optionally start crawl |
| GET | `/websites` | list (with `q` search, status) + page counts |
| GET | `/websites/{id}` | website detail |
| PUT | `/websites/{id}` | update crawl config (mode/depth/pages/frequency/robots) |
| DELETE | `/websites/{id}` | delete site + pages + chunks (`owner`/`admin`) |
| POST | `/websites/{id}/crawl` | start a fresh crawl job |
| POST | `/websites/{id}/recrawl` | recrawl with change detection |
| POST | `/websites/{id}/pause` | pause an active crawl |
| POST | `/websites/{id}/resume` | resume a paused crawl |
| GET | `/websites/{id}/pages` | list crawled pages (title, url, classification, chunks) |
| GET | `/websites/{id}/pages/{pid}` | page detail |
| GET | `/websites/{id}/jobs` | crawl job history |
| GET | `/websites/{id}/jobs/{jid}/logs` | per-URL crawl logs |
| GET | `/websites/{id}/analytics` | indexed/skipped/failed, chunk totals, by-type |

### Data model
- New table **`websites`** — `base_url`, `name`, `knowledge_base_id`,
  `crawl_mode`, `max_depth`, `max_pages`, `crawl_frequency`, `respect_robots`,
  `status`, `last_crawled_at`, `next_crawl_at`, `error`.
- New table **`website_pages`** — `website_id`, `url` (unique per site),
  `title`, `content_markdown`, `checksum`, `classification`, `status`,
  `chunk_count`, `depth`.
- New tables **`crawl_jobs`** + **`crawl_logs`** — job lifecycle
  (`queued→crawling→extracting→embedding→completed/failed/paused/cancelled`),
  page counters, chunk counts, and per-URL structured logs.
- **`document_chunks`** extended: `website_page_id`, `organization_id`,
  `knowledge_base_id` (all nullable, CASCADE) + `document_id` made nullable, so
  one chunk table backs both documents and website pages.
- Status/mode values use **String columns + Python constant classes** (no DB
  enums) for forward-compatible flexibility.
- Migration: `20260704_0020_website_crawling` (also adds a FTS **GIN** index on
  `to_tsvector('english', content)` and backfills denormalized org/KB).

### Crawler service (`backend/app/services/website_crawler.py`)
- `validate_url` (SSRF guard), `html_to_markdown` (`_HTMLExtractor`),
  `classify_url`, `discover_sitemap_urls`, robots loader, scope helpers.
- `run_crawl(job_id)` orchestrator: own `AsyncSessionLocal` session, BFS
  frontier, four crawl modes, checksum change-detection, `_persist_page`
  (chunk + embed → `DocumentChunk`), `_mark_deleted_pages`, `_next_crawl_at`,
  authenticated-header support, structured logging.

### Frontend
- `frontend/src/pages/dashboard/Websites.jsx` — KPI strip, search, website cards
  with live status (polls every 3s while crawling), crawl/recrawl/pause/resume/
  delete actions, a create modal (URL, KB, crawl scope picker, depth/pages/
  frequency, robots toggle), and a detail drawer with **Pages / Logs /
  Analytics** tabs (logs + job progress poll while a job runs).
- Sidebar entry **Websites**, route `/app/websites`.

---

## R4 — Enterprise RAG Engine

### Highlights
- **Hybrid retrieval**: dense vector search **+** Postgres full-text
  (`websearch_to_tsquery`) fused with **Reciprocal Rank Fusion**, then a
  deterministic re-rank (`0.55·vector + 0.30·rrf + 0.15·lexical`).
- **Unified sources**: a single query spans **documents and websites**; each
  citation carries `type`, `title`, `url`/`page`/`section`, and a score.
- **Grounded answers**: retrieve → build context → LLM answer with inline
  sources + a confidence score; on AI outage it falls back to an **extractive**
  answer (`grounded:false`) and never errors.
- **Related questions**: generated from context (deterministic fallback).
- **Org-isolated + fast**: filtering on denormalized `organization_id`;
  `knowledge_base_ids` and `source_types` filters supported.

### New / changed API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/rag/query` | grounded answer + sources + confidence + related questions |
| POST | `/rag/search` | hybrid search hits with score `components` (vector/lexical/rrf) |
| GET | `/rag/sources` | counts: documents, websites, chunks, knowledge bases |

### Services
- `backend/app/services/rag_service.py` (rewritten) — `hybrid_search()`,
  `RetrievedChunk` (document + website aware), `compute_confidence()`,
  `build_context()`, `dedupe_sources()`; backward-compatible `search_chunks()`
  still used by agent runtime + workflow engine.
- `backend/app/services/rag_answer.py` (new) — `answer_query()` orchestration
  with AI + extractive fallback and related-question generation.
- Schemas: `backend/app/schemas/rag.py`.

### Frontend
- `frontend/src/pages/dashboard/KnowledgeSearch.jsx` — "Ask Knowledge": query
  bar with **Ask AI / Hybrid search** toggle, source-type + knowledge-base
  filters, grounded answer card (confidence bar, extractive-fallback badge),
  numbered citations (documents and clickable website links), related-question
  chips, and a hybrid-search results view exposing score components.
- Sidebar entry **Ask Knowledge**, route `/app/knowledge-search`.

---

## R5 — Enterprise Integrations Platform

### Highlights
- **Connector framework**: a `BaseConnector` abstraction (OAuth + mock mode,
  `ConnectorError` / `RemoteDocument` / `ConnectResult`) with a registry and
  **17 providers** — Gmail, Outlook, Slack, MS Teams, OneDrive, SharePoint,
  Dropbox, Notion, Confluence, GitBook, GitHub, GitLab, Jira, Azure DevOps,
  Salesforce, HubSpot, Zendesk — plus a fully-implemented Google Drive connector.
- **Secure credential storage**: per-integration OAuth tokens encrypted at rest
  via `app/core/crypto.py` (`encrypt`/`decrypt`); tokens never leave the server.
- **Sync engine**: `sync_service.run_sync()` imports remote documents into a
  knowledge base, tracking `SyncJob` (`documents_synced`/`documents_deleted`/
  `errors`/timings) and `SyncLog` audit trail; browse + selective-import flow.
- **New in this release — operational endpoints**: connector **health**
  probing (with token-expiry detection), one-click **token refresh** (re-encrypt
  + persist), and per-integration **analytics** (sync counts, documents imported,
  average sync duration, recent jobs).

### New / changed API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/integrations/{id}/health` | live connector probe; flags `token_expired`, surfaces `last_error` |
| POST | `/integrations/{id}/refresh` | refresh + re-encrypt OAuth token (owner/admin) |
| GET | `/integrations/{id}/analytics` | sync-job aggregates, documents imported, avg duration, recent jobs |

> The platform foundation (catalog, connect, OAuth callback, sync, browse,
> selection, items, disconnect, jobs, logs) shipped previously; this release
> adds the operational health / refresh / analytics surface and the schemas
> `IntegrationHealth` and `IntegrationAnalytics`.

### Services & data model
- `backend/app/connectors/*` — `base.py`, `google_drive.py`, `providers.py`
  (17 connectors), `registry.py`.
- `backend/app/services/oauth_service.py`, `sync_service.py`;
  `backend/app/core/crypto.py`.
- Models: `Integration`, `SyncJob`, `SyncLog`, `IntegrationDocument`.

### Frontend
- `frontend/src/pages/dashboard/Integrations.jsx` — provider catalog, connect /
  disconnect, browse & selective import, sync status, jobs & logs; surfaces the
  new health and analytics data. Route `/app/integrations`.

---

## R6 — Embedded Website Widget

### Highlights
- **One-line embed**: drop a single `<script src=".../widget.js"
  data-widget-id="wgt_…" async></script>` tag on any site to launch a branded
  AI chat experience powered by the R4 RAG engine.
- **Dependency-free loader + isolated iframe app**: `frontend/public/widget.js`
  injects a floating launcher and an **iframe** (full style isolation via
  `srcdoc`) that talks to the public API. Vanilla JS, no framework, no bundler.
  Renders welcome message, suggested questions, streaming-style replies, source
  citations, feedback 👍/👎, lead capture, and human-escalation.
- **White-label theming**: brand color, assistant/company name, welcome message,
  position (bottom-right / left), bubble vs popup, branding toggle.
- **Security by design**:
  - **Domain allow-list** — published widgets only answer on configured domains
    (Origin/Referer checked); empty list = unrestricted.
  - **Published-status gate** — draft/paused widgets return `403` to the public.
  - **Rate limiting** — per-widget sliding-window limiter (`429` on abuse).
  - **Input sanitization** — visitor context whitelisted (name/email/company/…)
    and length-capped; public config exposes **no org internals**.
- **Lead gen + escalation + analytics**: captures leads, escalates to a human,
  and records typed events (loaded/opened/closed/message/answer/lead/escalation/
  feedback/…) for per-widget analytics (sessions, conversations, messages,
  opens, leads, escalations, CSAT, top questions).
- **Conversation continuity**: visitor sessions restore transcripts; each chat
  persists a real `Conversation` (channel = `chat`) when an agent resolves, so
  widget chats appear in the dashboard alongside other channels.

### New API endpoints (`/api`)
**Admin (authenticated, org-scoped)**
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/widgets` | create widget |
| GET | `/widgets` | list widgets (`q`, `limit`) with sessions count + embed snippet |
| GET | `/widgets/{id}` | read one |
| PUT | `/widgets/{id}` | update config / theme / settings / domains |
| DELETE | `/widgets/{id}` | soft-delete |
| POST | `/widgets/{id}/publish?publish=` | publish / unpublish |
| POST | `/widgets/{id}/regenerate-key` | rotate public embed key |
| GET | `/widgets/{id}/analytics` | sessions, conversations, messages, opens, leads, escalations, CSAT, top questions |

**Public (unauthenticated, domain-restricted)**
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/widget/config?key=` | sanitized loader config (domain-checked when published) |
| POST | `/widget/session` | start / restore a visitor session + transcript |
| POST | `/widget/chat` | grounded answer + sources (RAG, fallback-safe) |
| POST | `/widget/stream` | SSE streaming answer (meta → delta → done) |
| POST | `/widget/lead` | capture a lead |
| POST | `/widget/escalate` | request a human |
| POST | `/widget/feedback` | rate an answer (1–5) |
| POST | `/widget/event` | record a typed analytics event |

### Services & data model
- `backend/app/services/widget_service.py` — embed-snippet builder, domain
  normalization + allow-list matching, in-memory rate limiter, agent
  resolution, public-config sanitizer, event logging.
- Models / tables (migration `0021_embedded_widget`):
  - **`widgets`** — `public_key` (unique), `status`, `widget_type`, `position`,
    `auth_mode`, `agent_id`, `knowledge_base_id`, `theme`/`settings` (JSONB),
    `published_at`, soft delete.
  - **`widget_domains`** — allow-listed domains (`unique(widget_id, domain)`).
  - **`widget_sessions`** — visitor sessions (`visitor_id`, `conversation_id`,
    `message_count`, `escalated`, timings).
  - **`widget_events`** — typed analytics events (`metadata` JSONB).
- Schemas: `backend/app/schemas/widget.py`.

### Frontend
- `frontend/public/widget.js` — the embeddable loader + iframe chat app
  (verified live on a sample page).
- `frontend/public/widget-demo.html` — sample host page demonstrating the embed.
- `frontend/src/pages/dashboard/Widgets.jsx` — widget manager: KPIs, list with
  copy-able embed snippet, publish toggle, key regeneration, create/edit modal
  (agent, knowledge base, type, position, brand color, welcome, suggested
  questions, domains, lead/escalation/branding toggles), and an analytics drawer.
- Sidebar entry **Widgets**, route `/app/widgets`, TopBar title **Website Widgets**.

---

## R7 — Developer Platform (Public API & Webhooks)

### Highlights
- **Versioned public REST API** under `/api/v1` — a stable, documented surface
  for third-party developers and server-to-server integrations, separate from
  the dashboard's internal API.
- **Scoped API keys** — `sk_ora_*` secrets, shown once on creation, stored as a
  hash. Each key carries a set of **fine-grained scopes** (e.g. `agents:read`,
  `chat:write`, `knowledge:read`, `workflows:read`, `widgets:read`,
  `integrations:read`, `analytics:read`, `usage:read`). Requests are rejected
  `403` when a key lacks the scope for an endpoint.
- **Plan-based rate limiting** — per-key requests-per-minute ceiling driven by
  the org's subscription plan (`api_rpm`: free `0`, starter `100`, business
  `1000`, enterprise unlimited). Over-limit returns `429`; a plan with `api_rpm`
  of `0` returns `402 Payment Required` to gate the free tier.
- **Idempotency** — `Idempotency-Key` header on `POST /v1/chat` returns the same
  result (and `conversation_id`) for retried requests.
- **Signed webhooks** — register HTTPS endpoints subscribed to typed events;
  each delivery is signed `X-OraOne-Signature: t=<ts>,v1=<hmac-sha256>` using a
  per-endpoint `whsec_*` secret (shown once, rotatable). Failures are recorded
  with attempt counts and last status; a **Send test** action delivers a sample
  payload and records the result.
- **API request logs** — every `/v1` call is recorded (method, path, status,
  key prefix, latency) for observability and per-key usage accounting.
- **Developer portal** — in-app docs: quick-start, base URL, auth model,
  language samples (curl / JavaScript / Python), a live **playground** (paste a
  key, run `/v1/ping` or `/v1/chat`), a grouped endpoint reference, and a link
  to the live `openapi.json`.

### New API endpoints
**Public versioned API (`/api/v1`, API-key auth, scope-gated)**
| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/ping` | — | auth check; echoes org + key scopes |
| GET | `/v1/agents` | `agents:read` | list agents |
| GET | `/v1/agents/{id}` | `agents:read` | read one agent |
| POST | `/v1/chat` | `chat:write` | grounded answer (idempotent, persists conversation) |
| GET | `/v1/conversations` | `chat:read` | list conversations |
| GET | `/v1/conversations/{id}` | `chat:read` | conversation + messages |
| GET | `/v1/knowledge-bases` | `knowledge:read` | list knowledge bases |
| GET | `/v1/documents` | `knowledge:read` | list documents |
| POST | `/v1/search` | `knowledge:read` | hybrid RAG search |
| GET | `/v1/widgets` | `widgets:read` | list widgets |
| GET | `/v1/workflows` | `workflows:read` | list workflows |
| GET | `/v1/integrations` | `integrations:read` | list integrations |
| GET | `/v1/usage` | `usage:read` | API usage / request counts |
| GET | `/v1/...` | scoped | additional read surfaces (`object`,`count`,`data[]` shape) |

**Webhooks (`/api`, dashboard auth, `apikeys.manage`)**
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/webhooks` | list endpoints + available event catalog |
| POST | `/webhooks` | create endpoint → returns `whsec_*` secret once |
| PATCH | `/webhooks/{id}` | update url / events / status (active ↔ paused) |
| DELETE | `/webhooks/{id}` | remove endpoint |
| POST | `/webhooks/{id}/rotate` | rotate signing secret (returned once) |
| POST | `/webhooks/{id}/test` | deliver a signed sample payload, record result |
| GET | `/webhooks/{id}/deliveries` | recent delivery attempts |

**API keys (`/api`, dashboard auth)**
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api-keys` | list keys + available scope catalog |
| POST | `/api-keys` | create key → returns `sk_ora_*` secret once |
| DELETE | `/api-keys/{id}` | revoke key |

### Services & data model
- `backend/app/services/api_key_service.py` — key mint/hash/verify, scope
  enforcement, plan-driven `enforce_rate_limit` (`402`/`429`), usage accounting.
- `backend/app/services/webhook_service.py` — endpoint CRUD, HMAC-SHA256
  signing, delivery dispatch + retry/attempt tracking, test delivery.
- `backend/app/api/v2/public_api/routes.py` — the `/v1` surface (scope-gated,
  idempotent chat, uniform `{object,count,data[]}` list shape).
- `backend/app/core/api_scopes.py` — the scope catalog.
- Models / tables (migration `0022_dev_platform_analytics`):
  - **`api_keys`** — `prefix`, `key_hash`, `scopes` (JSONB), `last_used_at`,
    `expires_at`, soft delete.
  - **`webhooks`** — `url`, `events` (JSONB), `secret_hash`, `status`,
    `failure_count`, `last_status`, `last_delivery_at`.
  - **`webhook_deliveries`** — `event`, `success`, `status_code`, `attempts`,
    `error`, payload.
  - **`api_request_logs`** — `method`, `path`, `status_code`, `key_prefix`,
    `latency_ms`.
- Schemas: `backend/app/schemas/v2.py` (API keys, webhooks, `/v1` payloads).

### Frontend
- `frontend/src/pages/dashboard/ApiKeys.jsx` — key manager: scope picker,
  create modal, one-time secret reveal, revoke. Route `/app/api-keys`.
- `frontend/src/pages/dashboard/Webhooks.jsx` — endpoint manager: create
  (multi-event), one-time `whsec_*` reveal with signature-header docs, send
  test, pause/resume, rotate secret, delete, expandable delivery history.
  Route `/app/webhooks`.
- `frontend/src/pages/dashboard/Developers.jsx` — developer portal: quick-start
  cards, curl/JS/Python samples, live playground (`/v1/ping`, `/v1/chat`),
  grouped endpoint reference, OpenAPI link. Route `/app/developers`.
- Sidebar entries **API Keys**, **Webhooks**, **Developers**; TopBar titles
  **API Keys**, **Webhooks**, **Developer Platform**.

---

## R8 — Enterprise Analytics & Observability

### Highlights
- **Tabbed analytics dashboard** with 11 surfaces — **Overview**, **Executive**,
  **AI & Cost**, **Conversations**, **Agents**, **Knowledge**, **RAG**,
  **Widget**, **Workflows**, **Integrations**, **Team** — each a focused module
  with KPIs, time-series, breakdowns, and tables.
- **Executive summary** — business KPIs: automated interactions, conversion and
  satisfaction rates, **AI cost vs. human-equivalent cost**, **estimated
  savings**, and **ROI multiple**, plus channel and model breakdowns.
- **AI cost accounting** — per-model token aggregation priced into USD, cost per
  conversation, and projected monthly spend (computed from message token counts
  and model metadata).
- **RAG observability** — grounded vs. ungrounded answer rates and answer
  feedback (CSAT) to monitor retrieval quality.
- **Configurable range** — 7 / 14 / 30 / 90-day windows across every module.
- **CSV export** — one-click export of any module's metrics
  (`/analytics/export?module=&days=&format=csv`).

### New API endpoints (`/api`, dashboard auth, `analytics:read`)
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/analytics/overview` | platform totals + series + breakdowns + top agents |
| GET | `/analytics/executive` | business KPIs, ROI/savings, cost & channel breakdowns |
| GET | `/analytics/cost` | token totals, cost/conversation, projected monthly, by-model |
| GET | `/analytics/chat` | conversation/message volume, channel/status, feedback CSAT |
| GET | `/analytics/agents` | per-agent conversations, qualified, conversion rate |
| GET | `/analytics/knowledge` | KBs/documents/chunks/websites + document status |
| GET | `/analytics/rag` | grounded/ungrounded answer rates + feedback |
| GET | `/analytics/widget` | widget sessions/messages/escalations/leads + events |
| GET | `/analytics/workflows` | runs, success rate, status breakdown, top workflows |
| GET | `/analytics/integrations` | integrations + sync jobs + documents synced |
| GET | `/analytics/users` | members, active users, role breakdown |
| GET | `/analytics/modules` | catalog of available analytics modules |
| GET | `/analytics/export` | CSV export of any module (`module`, `days`, `format`) |

### Services & data model
- `backend/app/services/analytics_service.py` — per-module aggregation functions
  (executive/cost/chat/agents/knowledge/rag/widget/workflows/integrations/users),
  USD cost pricing, ROI/savings math, ordinal `GROUP BY` for JSONB-keyed model
  rollups, and the CSV serializer.
- `backend/app/api/v2/analytics/routes.py` — the analytics router.
- Reuses existing tables (conversations, messages, agents, knowledge,
  widgets, workflows, integrations, members); answer feedback persisted via
  message metadata (`grounded`, feedback flags).

### Frontend
- `frontend/src/pages/dashboard/Analytics.jsx` — rewritten as a tabbed
  enterprise dashboard (recharts): range selector, per-tab KPI cards,
  area/bar/donut charts, data tables, feedback strips, model-cost table,
  refresh, and CSV export. Route `/app/analytics`, TopBar title **Analytics**.

---

## Migrations applied
```
... → 0017_audit_logs
     → 0018_chat_organization        (R1)
     → 0019_knowledge_organization   (R2)
     → 0020_website_crawling         (R3/R4)
     → 0021_embedded_widget          (R6)
     → 0022_dev_platform_analytics   (R7/R8, head)
```
Run with:
```powershell
cd backend
$env:PYTHONUTF8="1"
$env:DATABASE_URL="postgresql+asyncpg://<user>:<pass>@<host>:<port>/<db>"
python -m alembic upgrade head
```

## Verification
- **R1 backend** — folder/conversation CRUD, tag dedupe, folder/pinned/search
  filters, share token + public read, Markdown/JSON export, suggested questions.
- **R2 backend** — KB/folder CRUD, folder-scoped upload, processing with
  checksum + summary + suggested questions + metadata, tag patch, preview,
  dedup, versioning, version listing, knowledge search, bulk tag/move/delete.
- **Extractors** — JSON / HTML / XLSX / PPTX verified; `summarize_text` and
  `derive_questions` verified.
- **R3 backend** — website create (URL validated), single-mode crawl ran to
  `ready` (1 page, 1 chunk embedded, job `completed`); pages / jobs / logs /
  analytics endpoints verified.
- **R4 backend** — `/rag/query` returned a grounded-fallback answer with
  multi-source citations (website + document) at confidence 0.74; `/rag/search`
  returned hybrid hits with `{vector, lexical, rrf}` components; `/rag/sources`
  returned correct counts. All 14 R3/R4 routes present in `openapi.json`.
- **R5 backend** — `/integrations/{id}/health`, `/refresh`, and `/analytics`
  present in `openapi.json`; schemas `IntegrationHealth` / `IntegrationAnalytics`
  exported; connector registry exposes all 17 providers + Google Drive.
- **R6 backend** — migration `0021_embedded_widget` applied (head). Full
  end-to-end run: created a widget → published → `GET /widget/config` (sanitized)
  → `POST /widget/session` → `POST /widget/chat` returned an answer grounded on
  **3 retrieved sources** (embeddings live; extractive fallback while the AI
  token was expired) → `POST /widget/event` recorded. All 16 widget routes
  present in `openapi.json`.
- **R6 widget loader** — verified live in-browser on `widget-demo.html`: launcher
  bubble, isolated iframe, welcome + suggested questions, real chat answer with
  Employee Handbook citations, feedback controls, and related-question chips.
- **R6 dashboard** — `/app/widgets` renders KPIs, the widget card with copy-able
  embed snippet, publish toggle, and a working analytics drawer (live
  sessions/conversations/messages/opens counts).
- **R7 backend** — migration `0022_dev_platform_analytics` applied (head). Full
  end-to-end `/v1` run with a scoped `sk_ora_*` key: `ping` (200, echoes org +
  scopes), `agents` / `knowledge-bases` / `documents` / `widgets` / `workflows`
  / `integrations` / `usage` / `conversations` / `search` all `200`; `chat`
  returned a grounded-fallback answer and **persisted a conversation** (msgs: 2)
  when an agent resolved. **Idempotency** verified — a repeated `Idempotency-Key`
  returned the same `conversation_id`. **Scope denial** verified — a key without
  `workflows:read` got `403` on `/v1/workflows`. **Plan gating** verified — free
  plan (`api_rpm 0`) returned `402`; after upgrading the test org to the business
  plan (`api_rpm 1000`) requests succeeded. **Webhooks** — created an endpoint
  (`201`, `whsec_*` returned once), **send test** delivered a signed payload and
  recorded the delivery, `deliveries` listed the attempt.
- **R7 frontend** — `/app/api-keys`, `/app/webhooks`, and `/app/developers`
  render; the Developer portal **playground** ran `/v1/ping` (200) and `/v1/agents`
  (200) live with a freshly created key.
- **R8 backend** — all analytics modules returned `200` for a 30-day window:
  `overview`, `executive`, `cost`, `chat`, `agents`, `knowledge`, `rag`,
  `widget`, `workflows`, `integrations`, `users`, plus `modules`. **CSV export**
  returned `text/csv` for the requested module. A JSONB `GROUP BY` grouping error
  in the per-model cost rollup was fixed (ordinal `GROUP BY`).
- **R8 frontend** — `/app/analytics` renders all 11 tabs; Executive shows
  ROI/savings KPIs, AI & Cost shows token/cost KPIs with a spend-over-time chart
  and per-model cost table; range selector, refresh, and **Export CSV** (live
  `text/csv` download) all work.
- **Frontend** — production build compiles (`EXIT=0`); no type/lint errors in
  changed files.

## Operational notes
- AI provider token expiry only affects *generated* text; all AI features fall
  back to deterministic output and never block a request. Embeddings (retrieval)
  and the widget answer path remain functional via extractive fallback.
- New public route `/share/:token` is intentionally unauthenticated; it returns
  only the shared transcript and agent name.
- The widget public API (`/api/widget/*`) is intentionally unauthenticated but
  defended by published-status gating, domain allow-listing, per-widget rate
  limiting, and visitor-context sanitization. Rotate a leaked embed key via
  **Regenerate key**.
- Configure the widget API origin for split deployments with `WIDGET_API_BASE`
  (or `BACKEND_PUBLIC_URL`); the embed snippet auto-includes `data-api` when the
  backend differs from the CDN/frontend origin. `WIDGET_CDN_BASE` controls where
  `widget.js` is served from.
- **Public API keys** (`sk_ora_*`) and **webhook secrets** (`whsec_*`) are shown
  **once** at creation/rotation and stored only as hashes — treat them as
  credentials. Webhook payloads are signed `X-OraOne-Signature: t=<ts>,v1=<hmac>`;
  verify with the endpoint secret and reject stale timestamps.
- **API rate limits** are plan-driven (`api_rpm`): free `0` (gated `402`),
  starter `100`, business `1000`, enterprise unlimited. The current limiter is an
  in-process sliding window suitable for single-instance deployments.
- **Foundational vs. future infrastructure** — R7/R8 ship the full product
  surface (scoped keys, `/v1` API, signed webhooks, idempotency, request logs,
  cost/ROI analytics, CSV export) on the existing Postgres + FastAPI stack.
  Horizontal-scale hardening is intentionally deferred and not required for this
  release: distributed rate limiting / idempotency cache (**Redis**), durable
  webhook retry queue and analytics rollups (**Celery / background workers**),
  high-volume analytics storage (**ClickHouse**), an edge **API Gateway**, and
  packaged **multi-language SDKs** (the `/v1` surface + `openapi.json` already
  support client generation).

---

## R9 — Enterprise Team Collaboration

### Highlights
- **Teams (departments)**: create named teams with description, color and icon;
  add/remove members with per-team roles (**lead / editor / contributor /
  viewer**); member counts and rosters.
- **Resource sharing & ACL**: share any resource (agent, knowledge base,
  conversation, etc.) with users or teams at a granted permission level; an
  access-control layer governs who can view/edit shared resources.
- **Comments & threads**: comment on any resource, with threaded replies.
- **@mentions**: mentioning a teammate in a comment creates a notification and a
  mention record.
- **Reactions**: emoji reactions on comments.
- **Notifications**: typed notification center (`mention`, `comment`, `share`,
  `task_assigned`, `team_invite`) with unread counts, mark-as-read and
  mark-all-read.
- **Activity feed**: organization-wide stream of collaboration events
  (`team_created`, `team_updated`, `shared`, `commented`, `task_created`,
  `task_updated`) with actor attribution.
- **Tasks**: lightweight task system with assignee, status
  (**open / in_progress / done / cancelled**), due dates, and optional linkage to
  a resource or comment; "assigned to me" filtering and a Kanban board.
- **Resource follows**: follow a resource to receive its activity.
- **Workspace hub**: a single dashboard aggregating totals (teams, shared
  resources, comments, open tasks, my open tasks, unread notifications) plus
  recent activity.

### New API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/collab/workspace` | aggregated workspace totals + recent activity |
| GET | `/collab/members` | org member directory (for assignee/sharing pickers) |
| GET/POST | `/teams` | list / create teams |
| GET/PUT/DELETE | `/teams/{id}` | team detail / update / delete |
| POST/DELETE | `/teams/{id}/members[/{member_id}]` | add / remove team member |
| POST | `/share` | share a resource with a user or team |
| GET | `/resources/{type}/{id}/permissions` | list resource ACL entries |
| GET/POST | `/comments` | list / create comments (+ replies, @mentions) |
| POST | `/comments/{id}/reactions` | toggle emoji reaction |
| GET | `/notifications` | notifications + unread count |
| PUT | `/notifications/{id}/read` · POST `/notifications/read-all` | mark read |
| GET | `/activity` | organization activity feed |
| GET/POST | `/tasks` | list (`mine`, `status`) / create tasks |
| PUT | `/tasks/{id}` | update task status |
| POST/DELETE | `/follow` | follow / unfollow a resource |

### Data model
- New tables: **`teams`**, **`team_members`**, **`resource_permissions`**,
  **`comments`**, **`mentions`**, **`reactions`**, **`notifications`**,
  **`activity_feed`**, **`tasks`**, **`resource_follows`** — all org-scoped with
  FK cascades and supporting indexes.
- Migration: `20260711_0023_collaboration_security`.

### Frontend
- `frontend/src/pages/dashboard/Workspace.jsx` — collaboration hub (stat cards +
  recent activity).
- `frontend/src/pages/dashboard/Teams.jsx` — team CRUD, member management drawer,
  role badges (gated by `team.manage`).
- `frontend/src/pages/dashboard/Tasks.jsx` — Kanban board, create-task modal,
  "assigned to me" toggle.
- `frontend/src/pages/dashboard/ActivityCenter.jsx` — tabbed Activity +
  Notifications (mark read / mark all).
- Routes `/app/workspace`, `/app/teams`, `/app/tasks`, `/app/activity`,
  `/app/notifications` + sidebar/top-bar entries.

---

## R10 — Enterprise Security & Release Readiness

### Highlights
- **PII detection & masking**: regex-based detection (email, phone, SSN, etc.)
  with a masking endpoint that returns redacted text and findings.
- **Prompt-injection protection**: inline detection of instruction-override and
  other injection patterns on inbound text, with severity scoring.
- **Content moderation**: keyword-based moderation flags categories on input and
  output.
- **Output validation**: scans model output for leaked secrets / internal data
  and reports violations.
- **Unified security scanner**: a single `/security/scan` endpoint runs PII,
  injection, moderation and (for `output`) validation, returning an aggregate
  `safe` verdict and `severity` (info → critical).
- **Security events**: persisted security event log with severity breakdown and
  filtering.
- **Audit trail**: queryable audit log of privileged actions (action, resource,
  actor, metadata).
- **System health & metrics**: live health checks (database, AI provider, object
  storage, auth) and rolling API metrics (requests, errors, error rate, latency,
  status-class breakdown).
- **Release readiness**: a 15-point readiness scorecard (auth, API security,
  injection, PII/moderation, output validation, audit, monitoring, etc.) with an
  overall pass score.
- **Feature flags**: org- and global-scoped flags with environment targeting and
  rollout percentage; create / toggle.
- **Deployment history**: record and list deployments (version, environment,
  status: pending → in_progress → succeeded / failed / rolled_back).

### New API endpoints (`/api`)
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/security/scan` | run PII + injection + moderation (+ output validation) |
| POST | `/security/mask` | mask PII in text |
| GET | `/security/events` | security event log (severity / type filters) |
| GET | `/security/audit` | audit trail (action filter) |
| GET | `/system/health` | component health checks |
| GET | `/system/metrics` | rolling API + audit + security metrics |
| GET | `/system/readiness` | release-readiness scorecard |
| GET/POST | `/system/features` | list / create feature flags |
| PUT | `/system/features/{id}` | toggle a feature flag |
| GET/POST | `/system/deployments` | list / record deployments |

### Data model
- New tables: **`security_events`**, **`feature_flags`**,
  **`deployment_history`** — org-scoped with indexes.
- Migration: `20260711_0023_collaboration_security` (shared with R9).

### Frontend
- `frontend/src/pages/dashboard/Operations.jsx` — tabbed Operations & Security
  console: System Health, Security Scanner, Security Events, Audit Log, Feature
  Flags, Readiness, Deployments (mutations gated by `settings.manage`).
- Route `/app/operations` + sidebar/top-bar entries.

### Operational notes & deferred infrastructure
- **Security primitives ship in-product** — PII/injection/moderation/output
  validation run inline on the existing FastAPI + Postgres stack with
  deterministic, dependency-free detectors, so the security console works with no
  external services.
- **Foundational vs. future infrastructure** — the following enterprise hardening
  is intentionally **deferred** and not required for this release; each maps to a
  managed/operational layer rather than product code:
  - **Real-time collaboration transport** — live comments/notifications currently
    poll; production real-time would use **WebSockets / SSE** with a **Redis**
    presence/pub-sub layer.
  - **External notification fan-out** — email/SMS/chat delivery via
    **SNS / SES / Slack / Microsoft Teams** webhooks (in-app notifications ship
    today).
  - **Malware / file scanning** — **ClamAV / GuardDuty** for uploaded documents.
  - **Secrets & encryption** — **AWS KMS / Secrets Manager** envelope encryption
    and key rotation.
  - **Edge protection** — **WAF / Shield** and an edge **API Gateway**.
  - **Load & resilience testing** — **k6 / Locust** suites and **multi-AZ DR**.
  - **Centralized observability** — **CloudWatch / X-Ray** dashboards, distributed
    tracing and alerting (in-app health/metrics/readiness ship today).
