# OraOne — Database & Cache

PostgreSQL (async SQLAlchemy + Alembic, `backend/alembic/versions/`) is the
single system of record — one `oraone` database, ~45 tables separated by
naming/foreign keys (not separate schemas). Redis is optional, additive
state (idempotency, rate limiting, refresh tokens, entitlement cache) — the
app never crashes if it's unavailable.

## Domains

```
PostgreSQL
├── Identity (users, password_hash, sessions)
├── Organizations / Memberships (multi-tenancy boundary)
├── Agents (chat/WhatsApp assistants, prompt versions)
├── Conversations / Messages (channel-tagged, cursor-paginated)
├── Knowledge / Documents (chunks + metadata; binaries live in MinIO/S3)
├── Widgets (embeddable chat, public keys, domains, sessions)
├── Integrations (third-party connections, encrypted credentials)
├── Webhooks / Outbox (transactional outbox — see Backend.md)
├── Analytics (events, daily rollups, cost reports)
└── pgvector (embeddings, cosine-similarity search)
```

## Core entities (fields)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    USERS ||--o{ ORGANIZATION_MEMBERS : joins
    ORGANIZATIONS ||--o{ AGENTS : owns
    ORGANIZATIONS ||--o{ KNOWLEDGE_BASES : owns
    ORGANIZATIONS ||--o{ API_KEYS : owns
    AGENTS ||--o{ CONVERSATIONS : handles
    CONVERSATIONS ||--o{ MESSAGES : contains
    KNOWLEDGE_BASES ||--o{ DOCUMENTS : contains
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : "chunked into"
    AGENTS ||--o{ WIDGETS : "published as"
    KNOWLEDGE_BASES ||--o{ WIDGETS : "grounds"

    USERS {
        uuid id PK
        string email UK
        string password_hash "Argon2, nullable"
        bool is_email_verified
        enum role "owner/admin/member"
        enum status "active/suspended/deleted"
    }
    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        enum plan "free/starter/growth/enterprise"
        uuid owner_user_id FK
        jsonb settings
    }
    ORGANIZATION_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        enum role "owner/admin/member/viewer"
        enum status "active/invited/removed"
    }
    AGENTS {
        uuid id PK
        uuid organization_id FK
        uuid project_id FK "nullable"
        string name
        enum type "chat/whatsapp/sales/support"
        enum status "draft/active/paused/archived"
        text description
    }
    CONVERSATIONS {
        uuid id PK
        uuid organization_id FK
        uuid agent_id FK
        uuid user_id FK "nullable, visitor"
        enum channel "chat/whatsapp/sms/email/..."
        enum status "active/completed/qualified/failed/lost"
        datetime started_at
    }
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        enum sender "agent/customer/system/tool"
        text message
        int token_count "nullable"
        jsonb metadata
    }
    KNOWLEDGE_BASES {
        uuid id PK
        uuid organization_id FK
        uuid project_id FK "nullable"
        string name
        enum status "draft/active/archived"
    }
    DOCUMENTS {
        uuid id PK
        uuid knowledge_base_id FK
        uuid organization_id FK "denormalised"
        string s3_key
        enum status "pending/processing/processed/failed"
        bigint size_bytes
    }
    DOCUMENT_CHUNKS {
        uuid id PK
        uuid document_id FK "nullable, or website_page_id"
        int chunk_index
        text content
        vector embedding "pgvector(1024), nullable"
    }
    WIDGETS {
        uuid id PK
        uuid organization_id FK
        uuid agent_id FK "nullable"
        uuid knowledge_base_id FK "nullable"
        string public_key UK
        string status "draft/published/paused"
        string widget_type "bubble/inline/fullpage/popup/button"
    }
    API_KEYS {
        uuid id PK
        uuid organization_id FK
        string prefix UK "non-secret, for lookup/display"
        string key_hash "SHA-256 of the full secret"
        jsonb scopes
    }
```

All tables carry `id` (UUID PK), `created_at`/`updated_at`, and most also
`deleted_at` (soft delete — `SoftDeleteMixin`). Every tenant-scoped table
indexes `organization_id`; document/message tables add a composite index
on `(parent_id, created_at)` for cursor pagination.

## Object storage — Postgres holds metadata, MinIO/S3 holds bytes

```mermaid
flowchart TD
    Upload["Document upload"] --> Meta["metadata (filename, org, status)"]
    Upload --> Binary["binary object"]
    Upload --> Embed["embeddings"]
    Meta -->|synchronous| PG[("PostgreSQL")]
    Binary -->|synchronous| S3[["MinIO / S3-compatible"]]
    Embed -->|synchronous, ingestion pipeline| PGV[("pgvector")]
```

`app/services/storage.py` is S3-compatible when `S3_BUCKET`/`S3_ENDPOINT_URL`
are set (real AWS S3, MinIO, Cloudflare R2, Backblaze B2 — auto-creates the
bucket on first use for non-AWS endpoints), otherwise falls back to local
disk under `UPLOAD_DIR`.

Every business mutation and its corresponding outbox event (if any) commit
**in the same database transaction** — this is what makes the
transactional-outbox guarantee (see [Backend](BACKEND.md#transactional-outbox-webhooks--at-least-once-delivery)) actually hold.

Notable migrations: `0044_self_hosted_auth` (password hash + email
verification columns, backfills the local admin account),
`0045_webhook_outbox` (transactional outbox table), `0046_contact_forms`
(contact/newsletter tables).

## Redis — usage & failure semantics

Redis sits behind a `CacheBackend` abstraction (`app/services/cache.py`):
`InProcessCacheBackend` (default, single-node) or `RedisCacheBackend`
(namespaced keys, native TTL, pub/sub invalidation). Selection is env-driven
(`REDIS_URL`, `ENTITLEMENTS_CACHE_BACKEND`) and **each consumer defines its
own failure policy, deliberately, not uniformly**:

```mermaid
flowchart TD
    Redis["Redis"] --> Cache["Entitlement/general cache"]
    Redis --> RateLimit["Rate limiting"]
    Redis --> Idem["Idempotency locks"]
    Redis --> Tokens["Refresh token store"]
    Redis --> OTP["Login OTP codes (10min TTL)"]

    Cache -->|failure| CacheF["bypass — fresh DB read"]
    RateLimit -->|failure| RateLimitF["fail OPEN — request proceeds<br/>(availability over strictness)"]
    Idem -->|failure| IdemF["fail CLOSED — 503<br/>(never risk an unprotected duplicate mutation)"]
    Tokens -->|failure| TokensF["fail SAFE — 503, not a raw 500<br/>(never issue tokens it can't later revoke)"]
    OTP -->|failure| OTPF["login fails safely — 503<br/>(never skip the second factor)"]
```

Not cached: conversation content, message bodies, anything containing PII —
only counters, entitlement booleans, and opaque token/OTP references.
