# Environment Variables

Every environment variable the backend reads, grouped by subsystem. The
backend loads `backend/.env` automatically (`python-dotenv`, with
`override=True` so it always wins over any stray shell/OS-level variable of
the same name) regardless of the current working directory. Template:
`backend/.env.example`.

**Fail-fast policy:** variables marked **Required** raise at import time if
missing, so the server never starts against a wrong/incomplete config.

## Identity (self-hosted Argon2 + JWT) — required

No external identity provider (no AWS Cognito) — Postgres `users` is the
sole identity store.

| Variable | Required | Default | Notes |
|----------|:--------:|---------|-------|
| `JWT_SECRET_KEY` | ✅ | — | HS256 signing key. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `JWT_ACCESS_TTL_MINUTES` | — | `15` | Access token lifetime. |
| `JWT_REFRESH_TTL_DAYS` | — | `30` | Refresh token lifetime (rotates on use, reuse-detected). |
| `JWT_LEEWAY_SECONDS` | — | `60` | Clock-skew leeway for JWT validation. |
| `JWT_ISSUER` | — | `oraone-api` | `iss` claim. |
| `LOCAL_ADMIN_EMAIL` / `LOCAL_ADMIN_PASSWORD` | — | `admin@oraone.in` / `admin` | Seed account created by migration `0044`. |

## Database (PostgreSQL) — required

Provide either a full URL **or** the discrete `DB_*` parts.

| Variable | Required | Default | Notes |
|----------|:--------:|---------|-------|
| `DATABASE_URL` | ✅* | — | Async SQLAlchemy URL, e.g. `postgresql+asyncpg://user:pass@host:5432/oraone`. |
| `ALEMBIC_DATABASE_URL` | — | falls back to `DATABASE_URL` | Used by migrations (sync driver, e.g. `psycopg2`). |
| `DB_HOST` | ✅* | — | Used if `DATABASE_URL` is unset. |
| `DB_PORT` | — | `5432` | |
| `DB_USER` | ✅* | — | |
| `DB_PASSWORD` | ✅* | — | |
| `DB_NAME_PG` | — | `oraone` | |

\* Required as a group: set `DATABASE_URL` **or** the `DB_*` set. Needs the
`pgvector` extension (`CREATE EXTENSION vector`) — see [Database](DATABASE.md).

## CORS

| Variable | Default | Notes |
|----------|---------|-------|
| `CORS_ORIGINS` | `*` (example only) | Comma-separated allowed origins. **Never `*` in production.** |

## Redis (optional — falls back to in-process cache when unset)

| Variable | Default | Notes |
|----------|---------|-------|
| `REDIS_URL` | — | e.g. `redis://localhost:6379/0`. Unset = single-node in-process cache. |
| `ENTITLEMENTS_CACHE_BACKEND` | `inprocess` | `redis` to use `REDIS_URL`. |

See [Database → Redis](DATABASE.md#redis--usage--failure-semantics) for
per-primitive failure behavior.

## AI chat provider (optional — graceful fallback)

If unset, OraOne answers with grounded **extractive** snippets instead of a
generated response (never a hard failure).

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | — | OpenRouter / OpenAI-compatible key. |
| `OPENAI_BASE_URL` | — | Point at `https://openrouter.ai/api/v1` to use OpenRouter; unset = official OpenAI API. |
| `OPENAI_MODEL` | `openai/gpt-5.5` | Default chat model. |
| `AI_FORCE_MODEL` | — | Override the resolved model for all calls. |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` | — | Sent as `HTTP-Referer`/`X-Title` when `OPENAI_BASE_URL` points at OpenRouter. |

> **Gotcha:** if your OS/shell already has `OPENAI_API_KEY` (or any other
> var here) set globally, it would otherwise shadow `backend/.env`. Every
> `load_dotenv(...)` call in this repo passes `override=True` so
> `backend/.env` always wins — keep that pattern if you vendor it elsewhere.

## Embeddings (optional — RAG / document + website-crawl ingestion)

| Variable | Default | Notes |
|----------|---------|-------|
| `EMBEDDING_PROVIDER` | `hash` | `hash` (dependency-free, deterministic lexical-overlap vectors, always works) or `bedrock` (Amazon Titan v2, needs a valid `AWS_BEARER_TOKEN_BEDROCK`/AWS creds with model access). |
| `EMBEDDING_MODEL` | `amazon.titan-embed-text-v2:0` | Only used by the `bedrock` provider. |
| `EMBED_DIM` | `1024` | Vector width; must match the `vector(N)` DB column. |
| `BEDROCK_REGION` | `ap-southeast-2` | Only used by the `bedrock` provider. |
| `AWS_BEARER_TOKEN_BEDROCK` | — | Bedrock API key. An **invalid** key fails document upload/website crawling outright (no silent fallback mid-ingest) — use `EMBEDDING_PROVIDER=hash` if you don't have a working one. |
| `AWS_REGION` | `us-east-1` | Fallback region for S3/SES/Bedrock if those are configured. |

### Reranking (optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `RERANKER_PROVIDER` | `heuristic` | `cohere`, `jina`, `local`, or `heuristic`. |
| `COHERE_API_KEY` / `COHERE_RERANK_MODEL` | — / `rerank-english-v3.0` | For `cohere` provider. |
| `JINA_API_KEY` / `JINA_RERANK_MODEL` | — / `jina-reranker-v2-base-multilingual` | For `jina` provider. |
| `BGE_RERANK_MODEL` | `BAAI/bge-reranker-base` | For `local` provider. |
| `RERANK_HTTP_TIMEOUT` | `8.0` | Seconds. |

## Object storage (optional — falls back to local disk under `UPLOAD_DIR`)

Works with real AWS S3 (leave `S3_ENDPOINT_URL` unset) or any S3-compatible
store — MinIO, Cloudflare R2, Backblaze B2 — by setting `S3_ENDPOINT_URL`.

| Variable | Default | Notes |
|----------|---------|-------|
| `S3_BUCKET` | — | If set, uploads go to S3/S3-compatible storage; **must** be paired with `S3_ENDPOINT_URL` for a non-AWS endpoint (see the [local-dev incident](DEPLOYMENT.md#common-incidents)). |
| `S3_REGION` | falls back to `AWS_REGION`, then `us-east-1` | |
| `S3_ENDPOINT_URL` | — | e.g. `http://localhost:9000` for local MinIO. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | Required alongside `S3_ENDPOINT_URL` for non-AWS endpoints. |
| `UPLOAD_DIR` | `/tmp/oraone-uploads` | Local fallback directory. |

## Widget & public URLs

| Variable | Default | Notes |
|----------|---------|-------|
| `FRONTEND_URL` | `http://localhost:3000` | Used for widget CDN base and email verification/reset links. |
| `WIDGET_CDN_BASE` | falls back to `FRONTEND_URL` | Where the widget script is served. |
| `WIDGET_API_BASE` / `BACKEND_PUBLIC_URL` / `PUBLIC_BACKEND_URL` / `BACKEND_URL` | — | First match used as the widget's API base. |

## Transactional email (optional — graceful fallback)

If unset, emails (including login/verification OTP codes) are rendered and
logged but not sent, so flows never break in development.

| Variable | Notes |
|----------|-------|
| `EMAIL_FROM` | Verified sender address. Enables sending via SES. |
| `SES_REGION` | SES region (falls back to `AWS_REGION`, then `us-east-1`). |

Templates: `backend/app/emails/templates`. Renderer/sender:
`backend/app/services/email_service.py`.

## Billing (Stripe — optional)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | If set **and** the `stripe` package is importable, real Checkout/Portal sessions are created. Otherwise billing runs in **mock mode** (upgrades succeed locally, no real charge). |
| `STRIPE_WEBHOOK_SECRET` | Verifies incoming Stripe webhook signatures. |

## Other optional integrations

| Variable | Notes |
|----------|-------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Drive integration (OAuth). |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | WhatsApp/SMS channel adapter. Channel stays disabled, no error, if unset. |

## Platform / admin

| Variable | Notes |
|----------|-------|
| `PLATFORM_ADMIN_EMAILS` | Comma-separated emails allow-listed for the Super Admin Control Center (`/admin/*`, `/api/super-admin/*`). |
| `ENVIRONMENT` | `development` / `production` — gates cookie `Secure` flag, error verbosity, etc. |
