# OraOne — Database Setup (Postgres + Alembic)

The OraOne backend uses **AWS RDS PostgreSQL** as its primary data store
for tenant-scoped business data (users, orgs, agents, conversations, etc.).
Schema is managed by **Alembic** migrations checked into `backend/alembic/`.

> The legacy `MongoDB` connection is still used for transient `agents`/`leads`
> demo collections and will be migrated over in a follow-up task.

---

## 1) Connection details

Set these in `backend/.env` (already wired from `backend/.env.local.example`):

```env
DB_HOST=oraone-postgres.c38080q04ynb.ap-south-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=oraone
DB_USER=oraone_admin
DB_PASSWORD=...

# Composed automatically by app code; set explicitly here for clarity:
DATABASE_URL=postgresql+asyncpg://oraone_admin:...@<host>:5432/oraone
ALEMBIC_DATABASE_URL=postgresql+psycopg2://oraone_admin:...@<host>:5432/oraone
```

⚠️ **Network reachability**: the RDS instance resolves to a **private VPC IP**
(`10.0.130.156`). It is not reachable from arbitrary internet egress — including
the Emergent preview pod. To run migrations or seed data you need one of:

- A laptop on the VPC's VPN
- An EC2 / Cloud9 instance inside the same VPC
- A bastion + `ssh -L 5432:<rds-endpoint>:5432 ...` tunnel
- Or temporarily flip the RDS instance to **Publicly accessible = Yes** in
  the AWS console and whitelist your IP in its security group.

The backend boots cleanly even when Postgres is unreachable; the engine
initialises lazily and only the routes that need the DB will error out
(visible via `GET /api/db/health` which returns `503 db_unreachable: ...`).

---

## 2) Run the initial migration

From any machine with VPC access to RDS:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# One-time: create the `oraone` database inside the RDS instance.
# (RDS gives you a server, not a pre-named DB. Safe to re-run; idempotent.)
python scripts/bootstrap_db.py

# Sanity check — generates SQL without connecting:
alembic upgrade head --sql > /tmp/oraone_initial.sql
less /tmp/oraone_initial.sql

# Apply against RDS:
alembic upgrade head
```

You should see:

```
INFO  [alembic.runtime.migration] Running upgrade  -> 0001_initial
```

Verify via the running backend:

```bash
curl https://<your-host>/api/db/health
# → {"ok": true, "version": "PostgreSQL 16.x ...", "tables": [...8 tables...]}
```

---

## 3) Schema (Phase 1)

All tables get UUID primary keys + `created_at` / `updated_at`. Where soft-delete makes sense (everything except `agent_configs` and `messages`) we also add a nullable `deleted_at`. All tenant-scoped tables have an `organization_id` index. Flexible/extensible fields use Postgres `JSONB`.

| Table                  | Purpose                                                                | Soft-delete |
|------------------------|------------------------------------------------------------------------|:-----------:|
| `users`                | System-of-record identity. 1:1 with Cognito (`cognito_sub` unique). Columns: `id, cognito_sub, email, full_name, avatar_url, role, status, last_login_at, …`. | ✅ |
| `organizations`        | Multi-tenant boundary. Columns: `id, name, slug (unique), plan, owner_user_id, settings (JSONB), logo_url, …`. | ✅ |
| `organization_members` | N:M user↔org with role (`owner`/`admin`/`member`/`viewer`). Unique on `(organization_id, user_id)`. | ✅ |
| `agents`               | AI workers. Columns: `id, organization_id, name, description, type, status, model, system_prompt, avatar_url, created_by_user_id, …`. `type` ∈ `{voice, chat, whatsapp, sales, support}`. | ✅ |
| `agent_configs`        | 1:1 sidecar with voice/language/greeting/temperature/max_tokens + JSONB `extra`. | — |
| `conversations`        | Customer↔agent thread. Columns: `id, organization_id, agent_id, channel, status, customer_*, started_at, ended_at, summary, recording_url, transcript_url, extra (JSONB), …`. | ✅ |
| `messages`             | One utterance. Columns: `id, conversation_id, sender, message, audio_url, metadata (JSONB), …`. | — |
| `integrations`         | 3rd-party connections per org. Unique on `(organization_id, provider)`. Sensitive blob in `credentials (JSONB)`. | ✅ |

12 enum types are created up-front (`user_role`, `user_status`, `org_plan`, `member_role`, `member_status`, `agent_type`, `agent_status`, `conversation_channel`, `conversation_status`, `message_sender`, `integration_type`, `integration_status`). See `alembic/versions/*_0001_initial.py` for the source of truth.

### Layered access

```
routes  →  services  →  repositories  →  ORM models / database
```

- **`app/repositories/`** — one repo per aggregate (`UserRepository`, `OrganizationRepository`, `AgentRepository`, …). Thin, typed CRUD + targeted queries; soft-delete-aware via the `BaseRepository`.
- **`app/services/`** — orchestrate repos + business policy. Example: `IdentityService.upsert_from_cognito()` find-or-creates the user AND auto-creates a personal organization with the user as `owner` member on first login.

---

## 4) Creating new migrations

```bash
# Edit a model under backend/app/db/models/ then:
cd backend
alembic revision --autogenerate -m "add foo column"
# Review the generated file, edit if needed, then:
alembic upgrade head
```

Conventions:
- One migration per logical change. Keep them small + reversible.
- For Postgres `ENUM` types, use `op.execute("CREATE TYPE ...")` rather than
  letting SQLAlchemy emit it inline (see the initial migration as reference).
- Always provide a `downgrade()` even if it just drops a column.

---

## 5) Daily dev loop

```bash
# Start the engine + check
curl http://localhost:8000/api/db/health

# Open a psql shell
psql "$DATABASE_URL"

# Roll back the last migration
alembic downgrade -1

# Re-apply
alembic upgrade head

# See what's pending vs the DB
alembic history --verbose
alembic current
```

---

## 6) Troubleshooting

| Symptom | Fix |
|---|---|
| `connection timed out` to RDS | You're not on the VPC. See §1 reachability options. |
| `FATAL: database "oraone" does not exist` | The RDS server is reachable but the named database hasn't been created. Run `python scripts/bootstrap_db.py` once, then `alembic upgrade head`. |
| `relation "users" already exists` on first migration | RDS already had a hand-rolled schema. Either drop the conflicting tables or stamp the current state with `alembic stamp 0001_initial` first. |
| `psycopg2.OperationalError: SSL connection has been closed` | Add `?sslmode=require` to `ALEMBIC_DATABASE_URL`. |
| Backend boots but `/api/db/health` is 503 | Expected if RDS unreachable — services that don't need the DB still work. Whitelist the egress IP or move into the VPC. |
| Cognito login still uses DynamoDB upsert | That's intentional for now — Phase 2 will switch the user-upsert to Postgres. |

---

## 7) Phase 2 (TODO — not in this PR)

- Switch the Cognito post-login user-upsert from DynamoDB → Postgres `users`.
- Auto-create a personal `organization` + `organization_members` row on first login.
- Migrate `MongoDB.agents` and `MongoDB.leads` to `agents` + `conversations`.
- Add `RLS` (Row-Level Security) policies enforcing `org_id = current_setting('app.org_id')`.
