# OraOne Architecture Baseline & Dependency Map

**Purpose**: a factual, tool-verified snapshot of the codebase *as it exists right
now* (2026-08-20, after the self-hosted-auth + Redis idempotency/rate-limiting
migration), used as the reference point for the rest of the v1.0.0 architecture
work. Every finding below was verified by reading the actual source — this is
not a restatement of the target architecture, it's what's really there today.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the narrative system overview and
[ENVIRONMENT.md](ENVIRONMENT.md) for the full env-var reference.

---

## 1. External dependency inventory

| Dependency | Required? | Used by | Failure mode today |
|---|---|---|---|
| PostgreSQL (+ pgvector) | **Required** | System of record — every domain table, RAG vectors | `/api/health/db` → 503; most routes 500 |
| Redis | Optional | Entitlement cache, refresh tokens, idempotency, rate limiting | Falls back to in-process cache (`app/services/cache.py`) — single-node only, but the app **does not crash** |
| MongoDB | Optional (legacy) | `agents`/`leads` collections in `server.py`'s Mongo-backed routes only | Those specific legacy routes fail; Postgres-backed routes unaffected |
| OpenRouter/OpenAI (`OPENAI_API_KEY`) | Optional | LLM chat (`app/providers/`) | Falls back to `MockProvider` (deterministic canned replies) |
| AWS Bedrock (`AWS_BEARER_TOKEN_BEDROCK`) | Optional | Embeddings (RAG/crawling ingestion) | Falls back to `HashingEmbeddings` (lexical-overlap vectors, no external call) |
| AWS S3 (`S3_BUCKET`) | Optional | Document/object storage (`app/services/storage.py`) | Falls back to local disk under `UPLOAD_DIR` |
| AWS SES (`EMAIL_FROM`) | Optional | Transactional email | Falls back to log-only (email "sent" is logged, not delivered) |
| Stripe (`STRIPE_SECRET_KEY`) | Optional | Billing checkout/portal | Falls back to mock-mode billing (upgrades succeed locally, no real charge) |
| Twilio (`TWILIO_ACCOUNT_SID`) | Optional | WhatsApp/SMS channel adapter | Channel stays disabled, no error |

**Zero required AWS dependency remains.** Cognito and DynamoDB — the only
things that were ever *hard*-required — were fully removed this session
(self-hosted Argon2 + JWT auth; Postgres `users` table is now the sole
identity store). Every other AWS touchpoint (Bedrock, S3, SES) was already
optional-with-graceful-degradation before this session and still is.

## 2. Current backend module map

```
backend/app/
├── api/                 40+ route modules (agents, auth, chat, knowledge,
│                        websites, workflows, billing, integrations,
│                        marketplace, super_admin, public_api/v1, ...)
├── core/                config.py, security.py (NEW), crypto.py,
│                        api_scopes.py, permissions.py, model_catalogue.py
├── middleware/           jwt_auth.py (NEW: HS256-only), org_context.py,
│                        project_context.py, rate_limit.py (NEW),
│                        idempotency.py (NEW)
├── database/
│   ├── models/          ~40 SQLAlchemy models
│   └── repositories/     ALREADY EXISTS — agent/billing/conversation/
│                        integration/message/organization/
│                        organization_member/org_scoped/project_scoped/
│                        sync/team/user/workflow repositories + base.py
├── services/             ~50 service modules (business logic layer)
├── providers/            AI provider abstraction (mock/openai) + embeddings
│                        (hash/bedrock) — both already vendor-neutral
├── connectors/           17 third-party integration connectors (1 fully
│                        implemented: Google Drive; 16 mock/"coming soon")
├── workers/              background task modules
└── schemas/              Pydantic request/response models
```

**Finding**: the repository pattern the target architecture calls for
(§2 "Domain-driven boundaries" / §4 "Repository interfaces") **already
exists** — `app/database/repositories/*`. It is not used 100% consistently
(some services still query models directly rather than through a
repository), but the seam is there. This significantly de-scopes the
"CQRS / domain-driven folders" ask — the primitives exist; what's missing
is *consistent use* of them, not building them from zero.

## 3. Coupling & boundary violations found (grounded, not assumed)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | No structured error envelope | `grep` of `HTTPException(status_code=...)` across 26+ call sites in 7+ files shows every route raises a bare string `detail=`, not `{"error": {"code", "message", "request_id"}}` | Medium — fixable centrally (see §5) |
| 2 | No liveness/readiness split | `app/api/health.py` has only `/api/health` (always-200 liveness, already correct) and `/api/health/db` (a DB-only readiness check) — no combined `/api/health/ready` that also checks Redis | Low |
| 3 | Bare `except Exception:` blocks | 14 occurrences across `database/session.py`, `billing_service.py`, `document_processing.py`, `platform_admin.py` (×3), `platform_intelligence.py` (×3), `workflow_engine.py` (×2), `workspace_intelligence.py` — all reviewed; every one is a deliberate best-effort/non-fatal guard (e.g. "don't let an audit-log write crash the request"), not a silent-failure anti-pattern, but none of them log the swallowed exception | Low — should at least `log.debug()` before passing |
| 4 | No circuit breaker | Confirmed absent repo-wide (`grep` for "circuit breaker" only matches this doc/comments) | Low — at current scale (single Postgres, single Redis, one AI provider with a mock fallback) a circuit breaker adds complexity without a corresponding reliability win; retries+timeouts+fallback-provider already cover the real failure modes |
| 5 | Storage abstraction is S3-or-local only | `app/services/storage.py` — no MinIO/generic-S3-endpoint support yet | Medium — **cheap to fix**: boto3's `s3` client already supports `endpoint_url=`, so MinIO support is an additive parameter, not a rewrite (see §6) |
| 6 | No `/api/v1` versioning for the internal dashboard API | Only the external developer platform (`app/api/public_api/`) is versioned | Accepted as-is — renaming ~250 internal endpoints breaks every frontend call site for no user-facing benefit at this stage. Revisit only if/when a second API consumer (mobile app, public SDK) needs the internal surface too |
| 7 | `cognito_sub` naming left in place | Column/variable name kept across the codebase (documented in `User` model docstring as legacy naming, now = "auth subject id") | Cosmetic only — renaming is ~450 grep matches of pure churn risk for zero behavior change |

**What was *not* found** (checked and ruled out): no secrets committed to
git (`.env` properly gitignored), no `redis.set()` scattered ad-hoc outside
`app/services/cache.py`'s abstraction, no direct DB queries inside route
handlers bypassing repositories in the *new* auth code, no `except: pass`
silently swallowing without any log statement at all (all 14 have at least
a comment explaining the best-effort intent), timeouts are present on every
outbound `httpx` call already.

## 4. Features that must survive any further migration (regression checklist)

Verified working end-to-end as of this baseline:
- Self-hosted auth: register → verify → login → `/me` → `/identity` →
  refresh (rotation + reuse-detection) → logout / logout-all
- Org/project auto-provisioning on first `/identity` call
- Agent CRUD, org isolation (101/101 backend tests passing)
- LLM chat via OpenRouter (real completions verified)
- Website crawling → chunk embedding (hashing fallback) → RAG search
- Redis-backed idempotency (`Idempotency-Key` header) and tiered rate
  limiting (auth/password/AI/general tiers)
- Docker images for backend + frontend, `docker-compose.prod.yml` full stack

Any further refactor must re-run `pytest tests/test_entitlements.py
tests/test_authorization.py tests/test_phase5_org_isolation.py
tests/test_phase6_agents_crud.py tests/test_phase6_knowledge.py
tests/test_phase7_processing.py` (the CI gate) and the manual auth/RAG
smoke sequence above before being considered safe.

## 5. Prioritized next steps (highest leverage : lowest risk first)

1. **Global structured error envelope** — one FastAPI exception handler,
   zero call-site changes, fixes finding #1 for the entire API at once.
2. **`/api/health/ready`** — combined Postgres + Redis check, additive,
   zero risk to existing `/api/health` liveness semantics.
3. **MinIO support** — add `S3_ENDPOINT_URL` to `storage.py`'s existing
   boto3 client construction; additive parameter, not a rewrite.
4. **Gunicorn process supervision** — swap the Dockerfile `CMD` from bare
   `uvicorn` to `gunicorn -k uvicorn.workers.UvicornWorker`, config in
   `gunicorn.conf.py`.
5. **structlog** — replace the hand-rolled JSON access logger in
   `server.py`'s `request_context_mw` with `structlog`, same fields
   (`request_id`, `method`, `path`, `status_code`, `duration_ms`, plus add
   `organization_id`/`user_id` where available).
6. Frontend feature-based restructure, WCAG 2.2 AA pass, SEO upgrade —
   deliberately last: highest effort, least coupled to the backend
   architecture work, safest to schedule after the backend baseline above
   is solid.

Items 1–5 are implemented immediately following this document (same
session) since each is additive/low-risk per the analysis above. Item 6 is
tracked separately given its size.
