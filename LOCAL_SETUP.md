# OraOne — Run Locally

> **AWS status:** the AWS account backing this project's Cognito user pool and
> RDS Postgres instance has been closed. **Authentication (Cognito) will not
> work locally or in any environment until it's replaced** with a self-hosted
> auth system or a different provider — this is a known, tracked gap (see
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#authentication--authorization)).
> Everything else in this guide (database, backend, frontend, Redis) works
> fully locally without AWS.

## 1) Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Python | 3.10+ (3.11 recommended) | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| Yarn | 1.22+ (`npm i -g yarn`) | https://yarnpkg.com/ |
| PostgreSQL | 14+ | Local install, or `docker compose -f docker-compose.dev.yml up -d postgres` |
| Redis | 7+ (optional) | Local install, or `docker compose -f docker-compose.dev.yml up -d redis` — the app runs fine without it (in-process cache fallback) |
| MongoDB | 6+ (legacy `agents`/`leads` collections only) | `docker run -d -p 27017:27017 --name oraone-mongo mongo:7` |

If you have Docker, the fastest path is:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts Postgres and Redis only (see `docker-compose.dev.yml`) — it does
not run the application itself.

---

## 2) Clone & install

```bash
git clone https://github.com/OraOneHQ/oraone-web.git
cd oraone-web

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

---

## 3) Create env files

```bash
# from repo root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and point it at your local Postgres:

```bash
DATABASE_URL=postgresql+asyncpg://oraone:oraone_dev_password@localhost:5432/oraone
ALEMBIC_DATABASE_URL=postgresql+psycopg2://oraone:oraone_dev_password@localhost:5432/oraone
```

(Those are the credentials from `docker-compose.dev.yml`; adjust if you're
using your own local Postgres install instead.)

**Do NOT commit `.env`** — it's in `.gitignore`. Never put real secrets in a
file that isn't gitignored (see `docs/ENVIRONMENT.md` for the full variable
reference and validation rules).

---

## 4) Run database migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

This creates every table the app needs, including the Phase-1 entitlements
catalog. Re-run this any time you pull new migrations.

---

## 5) Start MongoDB (only needed for legacy agents/leads endpoints)

```bash
docker run -d -p 27017:27017 --name oraone-mongo mongo:7
```

---

## 6) Run backend on :8000

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Smoke test:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","time":"..."}
```

> The repo also has `main.py` (auth-only mini app). For full functionality use `server:app` as above.

---

## 7) Run frontend on :3000

```bash
cd frontend
yarn start
```

Open http://localhost:3000.

---

## 8) Auth (currently blocked — AWS Cognito is offline)

Signup/login/verify-email/forgot-password all call AWS Cognito
(`app/services/auth_service.py`, `app/middleware/jwt_auth.py`). With the AWS
account closed, every one of those calls will fail (JWKS fetch errors, or
`NotAuthorizedException`-style failures) unless you use one of these:

0. **Local-dev bypass (already implemented, fastest)** — set in `backend/.env`:
   ```bash
   LOCAL_AUTH_ENABLED=true
   LOCAL_AUTH_SECRET=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
   LOCAL_ADMIN_EMAIL=admin@oraone.in
   LOCAL_ADMIN_PASSWORD=admin
   ```
   `POST /api/auth/login` with that one email/password mints a locally-signed
   JWT instead of calling Cognito; every other login attempt still goes to
   Cognito unchanged. **Never enable this in production.**
1. A new AWS account + Cognito user pool is provisioned and `backend/.env`
   is repointed at it (`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, etc.), or
2. Auth is migrated to a self-hosted JWT system (bcrypt/argon2 password
   hashing, an OraOne-owned `users` table, refresh tokens) — see the
   Authentication section of `docs/ARCHITECTURE.md` for the recommended
   design, or
3. Auth is migrated to a different hosted provider (Auth0 / Clerk / Supabase
   Auth).

Every other feature (agents, knowledge base, conversations, dashboard shell,
marketing pages) can be exercised without logging in by pointing tests/dev
tooling at endpoints that don't require `Authorization`, or by stubbing
`get_current_user_claims` in a local branch while working on unrelated
features.

---

## 9) Troubleshooting

| Symptom | Fix |
|---|---|
| Backend exits with `KeyError: 'MONGO_URL'` | You haven't created `backend/.env`. Re-run step 3. |
| Backend exits with `Missing required environment variable: COGNITO_USER_POOL_ID` | `app/core/config.py` fails fast on missing Cognito config by design. Put a placeholder value in `.env` to boot the server for non-auth work — real logins won't work until Cognito is replaced (see step 8). |
| `sqlalchemy.exc.OperationalError` connecting to Postgres | Confirm Postgres is running (`docker compose -f docker-compose.dev.yml ps`) and `DATABASE_URL` in `backend/.env` matches its credentials/port. |
| Alembic complains about a missing revision | Run `alembic upgrade head` again after `git pull` — new migrations ship regularly. |
| CORS error in browser | In `backend/.env` set `CORS_ORIGINS=http://localhost:3000` (already in the example). |
| `boto3` says "Unable to locate credentials" | Only relevant once Cognito/S3/SES are wired to a live AWS account again — set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `backend/.env`. |

---

## 10) Docker (production-shaped images)

Both apps have production Dockerfiles (`backend/Dockerfile`,
`frontend/Dockerfile`) and are built/tagged as `v1.0.0`:

```bash
docker build --build-arg APP_VERSION=v1.0.0 -t oraone-backend:v1.0.0 ./backend
docker build --build-arg APP_VERSION=v1.0.0 --build-arg REACT_APP_API_URL=http://localhost:8000 \
  -t oraone-frontend:v1.0.0 ./frontend
```

Or run the whole stack (Postgres + Redis + backend + frontend) at once:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The backend container runs `alembic upgrade head` automatically on start,
then serves on `:8000`; the frontend container serves the static build via
nginx on `:8080` (mapped to `:3000` in the compose file). Auth still needs
either Cognito or `LOCAL_AUTH_ENABLED=true` in `backend/.env` — see §8.

---

## 11) Security notes

- Never commit `.env` files or real credentials — `.gitignore` already excludes `.env`, `*.pem`, and `product2.txt`.
- Rotate any credential that was ever committed to git history, even after removal from the working tree — removal alone doesn't invalidate a leaked key.
- Set `CORS_ORIGINS` to your exact frontend URL(s) in any non-local environment; never leave it as `*` in production.

