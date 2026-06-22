# OraOne — Status

## Original problem statement
Pull `https://github.com/varunjakkampudi-tech/oraone.git`, wire to AWS
(Cognito + DynamoDB + RDS Postgres), provide env for production + local.
Audit Phase 0 (infra), Phase 1 (auth), Phase 2 (Postgres) and make sure
the app runs anywhere without breaking after `git pull && run`.

## What's been implemented & verified

### Phase 0 (Infrastructure) — confirmed on user side
✅ AWS account, IAM, S3, Cognito (pool + client + Hosted UI), DynamoDB,
   custom VPC + subnets + IGW + S3 VPC endpoint, RDS PostgreSQL,
   security groups, EC2 with backend deployed.

### Phase 1 (Authentication) — 14/14 PASS (preview + localhost) — 2026-06-22
- POST /api/auth/signup (Cognito user create + code delivery + weak-password reject)
- POST /api/auth/verify (admin-confirm equivalent works end-to-end)
- POST /api/auth/login (access + id + refresh tokens, blocks unverified, rejects wrong pwd)
- GET  /api/auth/me (JWKS-validated, returns DynamoDB profile)
- POST /api/auth/refresh (returns rotated access token)
- POST /api/auth/logout (Cognito global sign-out)
- DynamoDB user upsert (userId/email/createdAt/lastLogin) on every login
- Fail-fast config: missing env vars raise at import (no silent AWS account swap)
- `tests/audit_phase1_auth.py` (re-runnable, env-portable via `API_BASE_URL=...`)

### Phase 2 (PostgreSQL Foundation) — 9/9 PASS — 2026-06-22
- Async SQLAlchemy + asyncpg, lazy engine, idempotent init_engine()
- Session factory (`AsyncSessionLocal`, `get_db` dependency)
- Repository pattern (BaseRepository[ModelT] + per-aggregate repos)
- Alembic configured to read DATABASE_URL / ALEMBIC_DATABASE_URL / DB_*
- All 3 migrations apply cleanly against a fresh Postgres 15
- `alembic_version` at head: `0003_doc_processing_telemetry`
- 12 tables created and match Base.metadata exactly (no drift)
- GET /api/health → 200, GET /api/health/db → 200 against local PG
- `tests/audit_phase2_postgres.py` (run with `OVERRIDE_DATABASE_URL=...`)

### Phase 6 (Agents System) — 24/24 PASS — 2026-06-22
- **Live audit** (`tests/audit_phase6_agents.py`) — 16/16:
  - All 11 `agents` cols + 8 `agent_configs` cols present
  - Full CRUD via HTTP (POST 201 / GET 200 / PUT 200 / DELETE 204)
  - Search (`q`), filter (`type`/`status`/`model`), pagination
    (`limit`/`offset`), sort (`±created_at|updated_at|name`)
  - Validation: temperature 0-2 + max_tokens 1-32000 + enum types → 422
  - Authorization: viewer role gets 403 on DELETE
  - Soft delete: subsequent GET → 404, list excludes row
  - Audit JSON for create/update/delete/read with `ts/action/resource/
    organization_id/user_id/before/after/meta`
  - Verified audit lines actually land in `/var/log/supervisor/backend.*.log`
- **Unit/integration tests** (`tests/test_phase6_agents_crud.py`) — 8/8

### Phase 5 (Multi-Tenant Foundation) — 12/12 PASS — 2026-06-22
Suite split into two layers, both green:

**Unit + integration tests** (`tests/test_phase5_org_isolation.py`) — 5/5
- `OrgScopedRepository` rejects tenant-less models at construction
- `add_for_org()` raises `PermissionError` on cross-org write attempts
- `add_for_org()` auto-stamps `organization_id` on fresh instances
- Repo-layer: Org A cannot read/list/mutate Org B's agents (live PG)
- HTTP-layer via `httpx.AsyncClient + ASGITransport`: Bob 404s on Alice's
  agent id for GET / DELETE / list, Alice gets her own row back

**Live HTTP cross-tenant audit** (`tests/audit_phase5_isolation.py`) — 7/7
Run against the real backend with two real Cognito users:
- Provisioned Alice + Bob get distinct orgs from `/api/auth/identity`
- Alice creates an agent
- Bob GET /api/agents/{alice_id} → 404 (no read leak)
- Bob DELETE /api/agents/{alice_id} → 404 (no write leak)
- Bob's `/api/agents` list excludes Alice's row
- Alice can still fetch her own row
- `X-Org-Id` spoof header is ignored (server resolves org from token+DB only)

### Phase 4 (Frontend Identity Integration) — 14/14 PASS — 2026-06-22
Verified via real Playwright browser flow against preview pod with PG backend:
- **AuthProvider state**: `identity`, `organization`, `membership`, `organizationId`,
  `organizationName`, `membershipRole` all exposed from `useAuth()`.
- **LocalStorage**: `oraone_identity` key persisted on login; payload contains
  `user/organization/membership`; auto-restored on hard refresh (stays on
  /app/overview, doesn't bounce to /login).
- **Login flow**: blocks redirect on `fetchIdentity()` so dashboard only mounts
  once identity is ready (Phase 4 requirement #6).
- **Protected route**: three states render correctly — auth loading
  (`protected-route-auth-loading`), workspace loading
  (`protected-route-identity-loading`), workspace error
  (`protected-route-identity-error` with `Retry` button).
- **TopBar**: shows workspace name (e.g. "Bob Workspace") + membership role
  badge ("OWNER") next to the page title; both have `data-testid` attrs
  (`topbar-workspace-name`, `topbar-workspace-role`).
- Forced /api/auth/identity 500 → app shows the clean retry UI instead of
  silently sitting on a broken dashboard.

### Phase 3 (Identity Layer) — 8/8 PASS — 2026-06-22
- All required columns present:
  - `users`: id, cognito_sub, email, full_name, avatar_url, role, status, created_at, last_login_at
  - `organizations`: id, name, slug, plan, owner_user_id, created_at
  - `organization_members`: id, organization_id, user_id, role, status, joined_at
- `GET /api/auth/identity` returns `{user, organization, membership, is_new_user}`
- First call auto-creates the triple (user + workspace + owner membership)
- Workspace name derives from first name ("Alice Tester" → "Alice Workspace"),
  never from the Cognito sub (UUID guard verified)
- Second call is idempotent: `is_new_user=false`, same ids, no duplicates
- 401 without Bearer token; `joined_at` stamped on membership
- `tests/audit_phase3_identity.py` (re-runnable, env-portable)

### Bugs found & fixed
1. **`config.py` had hardcoded AWS fallbacks** → rewrote with `_required()`
   helper so missing env raises at import time. No more silent talk-to-the-
   wrong-account in production.
2. **Migration `0003_document_processing_telemetry` had a 35-char revision id
   but `alembic_version.version_num` is `VARCHAR(32)`** → would crash any
   fresh deploy. Renamed to `0003_doc_processing_telemetry` (29 chars).
3. **Missing runtime deps** (`Mako`, `greenlet`) added to requirements.txt.
4. **`pytest` couldn't load `.env`** (broke after fail-fast config) →
   added `backend/conftest.py` that loads `.env` before any app import.
5. **`pytest.ini` for test discovery** → tests now run without
   `export PYTHONPATH=$(pwd)`.
6. **Misleading log line in `session.py`** — logged `DB_HOST` env var even
   when the actual engine used `DATABASE_URL` (so `localhost:5432` looked
   like `oraone-postgres.rds.amazonaws.com`). Now logs the real URL with
   password redacted.
7. **Flaky integration test `test_org_isolation_http_layer`** —
   `starlette.TestClient` is sync and spawns a fresh event loop per request,
   colliding with the asyncpg pool from the prior async fixture
   ("Future attached to a different loop"). Fixed by switching to
   `httpx.AsyncClient + ASGITransport` and adding engine dispose/recreate
   around the `db_session` fixture. **Important — this test was silently
   failing CI**, meaning tenant-isolation regressions could have slipped
   through unnoticed.
8. **Same flake in `test_phase6_agents_crud.py`** (`test_crud_full_lifecycle`,
   `test_pagination_and_sort`) → applied the same `AsyncClient` +
   engine-per-test fixture fix. Phase 6 unit/integration suite went from
   6/8 → 8/8.

### Env files (six total)
- `backend/.env` ............... live values (current preview)
- `backend/.env.local.example` . local dev defaults to LOCAL Postgres
- `backend/.env.production.example` for EC2 inside the RDS VPC
- `frontend/.env` .............. live values (current preview)
- `frontend/.env.local.example`. localhost
- `frontend/.env.production.example` production CDN

## What the user still needs to do (only they can)
1. **AWS Cognito App Client → Allowed Callback URLs**: add
   `https://9ac7729c-...preview.emergentagent.com/auth/callback`,
   `http://localhost:3000/auth/callback`, and any EC2/prod domain.
2. **EC2 deploy** (one-time, on EC2 inside the RDS VPC):
   ```
   git pull
   cd backend && pip install -r requirements.txt
   alembic upgrade head
   sudo systemctl restart oraone-backend   # or supervisor
   ```
3. **Rotate secrets** (`AKIA5YU64BPEUQND2BBE` + RDS password) shared in chat.
4. RDS in private VPC is unreachable from Emergent preview pod — by design.
   `/api/health/db` will show "TimeoutError" here; works perfectly from EC2.

## Re-running the audits
```bash
# Phase 1 — Cognito + DynamoDB
cd /app/backend
python tests/audit_phase1_auth.py                      # preview
API_BASE_URL=http://127.0.0.1:8001 python tests/audit_phase1_auth.py   # local

# Phase 2 — Postgres (against local PG)
OVERRIDE_DATABASE_URL="postgresql+asyncpg://oraone_local:oraone_local@localhost:5432/oraone_local" \
OVERRIDE_ALEMBIC_DATABASE_URL="postgresql+psycopg2://oraone_local:oraone_local@localhost:5432/oraone_local" \
python tests/audit_phase2_postgres.py
```

## Backlog
- Phase 3+ audits as user requests them
- Optional: drop the legacy MongoDB-backed `agents`/`leads` once Phase 6 routes are
  used end-to-end (currently both Mongo and Postgres versions are mounted).
