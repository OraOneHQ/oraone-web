# OraOne — Run Locally

Self-hosted stack: PostgreSQL (system of record) + Redis (optional cache/rate
limiting) + MinIO (optional S3-compatible storage) + FastAPI backend + React
frontend. No AWS account, Cognito, DynamoDB, or MongoDB required — all of
that legacy infrastructure has been removed.

## 1) Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| Yarn | 1.22+ (`npm i -g yarn`) | https://yarnpkg.com/ |
| Docker | any recent version | https://www.docker.com/products/docker-desktop/ (fastest path to Postgres/Redis/MinIO) |

If you have Docker, the fastest path is:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts Postgres (pgvector-enabled, port 5433), Redis (port 6379), and
MinIO (ports 9000/9001) — it does not run the application itself. Without
Docker, install Postgres 16+ with the `pgvector` extension yourself; Redis
and MinIO are both optional (the app falls back to an in-process cache and
local-disk storage respectively).

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

Edit `backend/.env` — at minimum you need:

```bash
JWT_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
DATABASE_URL=postgresql+asyncpg://oraone_admin:oraone_dev_password@localhost:5433/oraone
ALEMBIC_DATABASE_URL=postgresql+psycopg2://oraone_admin:oraone_dev_password@localhost:5433/oraone
```

(Those Postgres credentials/port match `docker-compose.dev.yml`; adjust if
you're using your own local Postgres install instead.)

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

This creates every table the app needs and backfills a local admin account
(`admin@oraone.in` / `admin` by default — see `LOCAL_ADMIN_EMAIL` /
`LOCAL_ADMIN_PASSWORD` in `.env`). Re-run this any time you pull new
migrations.

---

## 5) Run backend on :8000

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Smoke test:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","time":"..."}
curl http://localhost:8000/api/health/ready
# → {"status":"ready","checks":{"database":"connected","redis":"connected"}}
```

---

## 6) Run frontend on :3000

```bash
cd frontend
yarn start
```

Open http://localhost:3000 and log in with the seeded admin account
(`admin@oraone.in` / `admin`, or whatever you set via `LOCAL_ADMIN_*`).

---

## 7) Auth (self-hosted — works out of the box)

Signup/login/verify-email/forgot-password/refresh/logout are all self-hosted
(Argon2 password hashing + JWT access/refresh tokens — see
`app/services/auth_service.py`, `app/core/security.py`,
`app/middleware/jwt_auth.py`). No external identity provider is required.
The backend issues bearer tokens in the response body **and** sets httpOnly,
`SameSite=Lax` cookies (`app/core/cookies.py`) — the frontend uses the bearer
flow by default, cookies work as a defense-in-depth fallback for any client
that doesn't manage tokens in JS.

---

## 8) Troubleshooting

| Symptom | Fix |
|---|---|
| Backend exits with `Missing required environment variable: JWT_SECRET_KEY` | Set `JWT_SECRET_KEY` (32+ chars) in `backend/.env`. Re-run step 3. |
| `sqlalchemy.exc.OperationalError` connecting to Postgres | Confirm Postgres is running (`docker compose -f docker-compose.dev.yml ps`) and `DATABASE_URL` in `backend/.env` matches its credentials/port. |
| Alembic complains about a missing revision | Run `alembic upgrade head` again after `git pull` — new migrations ship regularly. |
| CORS error in browser | In `backend/.env` set `CORS_ORIGINS=http://localhost:3000` (already in the example). |
| Login works but refresh/logout return 503 | Redis is down — sign-in fails safely rather than issuing tokens it can't track for revocation. Start Redis (`docker compose -f docker-compose.dev.yml up -d redis`) or wait for the in-process fallback. |

---

## 9) Docker (production-shaped images)

Both apps have production Dockerfiles (`backend/Dockerfile`,
`frontend/Dockerfile`) and are built/tagged as `v1.0.0`:

```bash
docker build --build-arg APP_VERSION=v1.0.0 -t oraone-backend:v1.0.0 ./backend
docker build --build-arg APP_VERSION=v1.0.0 --build-arg REACT_APP_API_URL=http://localhost:8000 \
  -t oraone-frontend:v1.0.0 ./frontend
```

Or run the whole stack (Postgres + Redis + MinIO + backend + frontend + Caddy
reverse proxy) at once:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The backend container runs `alembic upgrade head` automatically on start,
then serves under Gunicorn on `:8000`; the frontend container serves the
static build via nginx on `:8080` (mapped to `:3000` in the compose file).

---

## 10) Security notes

- Never commit `.env` files or real credentials — `.gitignore` already excludes `.env`, `*.pem`, and `product2.txt`.
- Rotate any credential that was ever committed to git history, even after removal from the working tree — removal alone doesn't invalidate a leaked key.
- Set `CORS_ORIGINS` to your exact frontend URL(s) in any non-local environment; never leave it as `*` in production.

