# Environment Variables

Every environment variable the backend reads, grouped by subsystem. The backend
loads `backend/.env` automatically (via `python-dotenv`) regardless of the
current working directory.

**Fail-fast policy:** variables marked **Required** raise at import time if
missing, so the server never starts against a wrong account or pool.

## Identity (AWS Cognito) — required

| Variable | Required | Default | Notes |
|----------|:--------:|---------|-------|
| `AWS_REGION` | ✅ | — | AWS region for Cognito/DynamoDB/S3. |
| `COGNITO_USER_POOL_ID` | ✅ | — | Cognito user pool. |
| `COGNITO_CLIENT_ID` | ✅ | — | App client id (alias: `COGNITO_APP_CLIENT_ID`). |
| `COGNITO_REDIRECT_URI` | — | `http://localhost:3000/auth/callback` | OAuth callback. |
| `COGNITO_DOMAIN` | — | derived from pool id | Hosted UI domain; computed if unset. |
| `DYNAMODB_USERS_TABLE` | — | `oraone-users` | User directory table. |
| `JWT_LEEWAY_SECONDS` | — | `60` | Clock-skew leeway for JWT validation. |

> AWS credentials are **not** read from config — boto3 uses its default
> credential chain (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / IAM role).

## Database (PostgreSQL) — required

Provide either a full URL **or** the discrete `DB_*` parts.

| Variable | Required | Default | Notes |
|----------|:--------:|---------|-------|
| `DATABASE_URL` | ✅* | — | Async SQLAlchemy URL, e.g. `postgresql+asyncpg://user:pass@host:5432/oraone`. |
| `ALEMBIC_DATABASE_URL` | — | falls back to `DATABASE_URL` | Used by migrations. |
| `DB_HOST` | ✅* | — | Used if `DATABASE_URL` is unset. |
| `DB_PORT` | — | `5432` | |
| `DB_USER` | ✅* | — | |
| `DB_PASSWORD` | ✅* | — | |
| `DB_NAME` | ✅* | `oraone` (bootstrap) | |

\* Required as a group: set `DATABASE_URL` **or** the `DB_*` set.

## AI provider (optional — graceful fallback)

If none are set, OraOne answers with grounded **extractive** snippets instead of
a generated response.

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | — | OpenRouter / OpenAI-compatible key. |
| `OPENAI_MODEL` | `openai/gpt-5.5` | Default chat model. |
| `AI_FORCE_MODEL` | — | Override the resolved model for all calls. |
| `AWS_BEARER_TOKEN_BEDROCK` | — | Optional AWS Bedrock token. |
| `BEDROCK_REGION` | `ap-southeast-2` | Bedrock region. |

### Reranking (optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `RERANKER_PROVIDER` | `heuristic` | `cohere`, `jina`, `local`, or `heuristic`. |
| `COHERE_API_KEY` | — | For `cohere` provider. |
| `COHERE_RERANK_MODEL` | `rerank-english-v3.0` | |
| `JINA_API_KEY` | — | For `jina` provider. |
| `JINA_RERANK_MODEL` | `jina-reranker-v2-base-multilingual` | |
| `BGE_RERANK_MODEL` | `BAAI/bge-reranker-base` | For `local` provider. |
| `RERANK_HTTP_TIMEOUT` | `8.0` | Seconds. |

## Storage

| Variable | Default | Notes |
|----------|---------|-------|
| `S3_BUCKET` | — | If set, uploads go to S3; otherwise local disk. |
| `S3_REGION` | falls back to `AWS_REGION`, then `us-east-1` | |
| `UPLOAD_DIR` | `/tmp/oraone-uploads` | Local fallback directory. |

## Widget & public URLs

| Variable | Default | Notes |
|----------|---------|-------|
| `FRONTEND_URL` | `http://localhost:3000` | Used for widget CDN base. |
| `WIDGET_CDN_BASE` | falls back to `FRONTEND_URL` | Where the widget script is served. |
| `WIDGET_API_BASE` / `BACKEND_PUBLIC_URL` / `PUBLIC_BACKEND_URL` / `BACKEND_URL` | — | First match used as the widget's API base. |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Lock down in production. |

## Transactional email (optional — graceful fallback)

If unset, emails are rendered and logged but not sent (development mode), so
flows never break. Configure these to send via Amazon SES.

| Variable | Notes |
|----------|-------|
| `EMAIL_FROM` | Verified SES sender address (alias: `SES_FROM_EMAIL`). Enables sending. |
| `SES_REGION` | SES region (falls back to `AWS_REGION`, then `us-east-1`). |

> Templates live in `backend/app/emails/templates`; the renderer/sender is
> `backend/app/services/email_service.py`.

## Billing (Stripe — optional)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | If set **and** the `stripe` package is importable, real Checkout/Portal sessions are created. Otherwise billing runs in **mock mode** (upgrades succeed locally). |

## Security & crypto

| Variable | Notes |
|----------|-------|
| `INTEGRATIONS_ENCRYPTION_KEY` | Key used to encrypt stored integration credentials. |
| `SECRET_KEY` | App secret (falls back to `COGNITO_CLIENT_ID` if unset). **Set explicitly in production.** |

## Operations & metadata

| Variable | Default | Notes |
|----------|---------|-------|
| `ORAONE_VERSION` | `1.0.0` | Reported by the ops/status endpoints. |

## Frontend

The frontend reads `REACT_APP_*` variables at build time. Key ones:

| Variable | Notes |
|----------|-------|
| `REACT_APP_BACKEND_URL` | Base URL of the backend API. |
| `REACT_APP_ORAONE_SUPPORT_WIDGET_KEY` | Override for the built-in support widget key. |

---

### Production checklist

- [ ] All **Required** identity + database vars set.
- [ ] `CORS_ORIGINS` restricted to your domains (not `*`).
- [ ] `SECRET_KEY` and `INTEGRATIONS_ENCRYPTION_KEY` set to strong, unique values.
- [ ] `S3_BUCKET` configured (don't rely on local upload dir).
- [ ] AI provider key set (or accept extractive-only answers).
- [ ] `ORAONE_VERSION` bumped per release.
