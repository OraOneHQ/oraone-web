# Operations Runbook

How to monitor, diagnose and recover OraOne in production.

## Health checks

| Endpoint | Returns | Use |
|----------|---------|-----|
| `GET /api/health` | `200` always when the app is up | Liveness / load-balancer target. |
| `GET /api/health/db` | `200` healthy, `503` if the DB is unreachable | Readiness / DB connectivity. |

The in-app **Status** page (`/app/status`) polls both every 30s and renders an
overall banner plus per-component health with latencies. The marketing
status/support section mirrors this for customers.

### Quick verification

```powershell
(Invoke-WebRequest -Uri "https://<host>/api/health" -UseBasicParsing).StatusCode      # 200
(Invoke-WebRequest -Uri "https://<host>/api/health/db" -UseBasicParsing).StatusCode   # 200 / 503
```

## Monitoring & what to watch

- **Liveness:** `GET /api/health` non-200 → app down; restart / check logs.
- **DB readiness:** `GET /api/health/db` = 503 → Postgres unreachable; check the
  database, connection pool, and network/tunnel.
- **Error rate:** spikes in `5xx` (provider/database) and `402`/`429` (limits).
- **AI provider:** `502` on chat usually means the AI provider key is invalid or
  the upstream is down. The dashboard chat path surfaces `AIProviderError` as
  `502`; the widget path degrades to extractive answers. Rotate/repair the
  provider key (`OPENAI_API_KEY`).

## Common incidents

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| App returns 500s on startup | Missing **Required** env var | Check logs for `Missing required environment variable`; set it (see [ENVIRONMENT.md](ENVIRONMENT.md)). |
| `GET /api/health/db` = 503 | DB down / bad `DATABASE_URL` / tunnel closed | Restore DB connectivity; verify credentials and host/port. |
| Chat returns `502` | Invalid/expired AI provider key | Rotate `OPENAI_API_KEY`; until fixed, answers are extractive only. |
| Customers hit `402` | Plan resource/AI-message quota | Confirm against [Plans & Limits](PLANS_AND_LIMITS.md); prompt upgrade. |
| Customers hit `429` | API rate limit (`api_rpm`) | Expected throttling; advise backoff or higher tier. |
| Widget not loading | Wrong `WIDGET_CDN_BASE` / `CORS_ORIGINS` | Verify public URLs and allowed origins. |

## Deploying changes

- **Backend changes** require a process restart — the server runs **without**
  `--reload`. Restart the service after any backend edit.
- **Database changes** require migrations:

```bash
cd backend
python -m alembic upgrade head
cd ..
```

- Bump `ORAONE_VERSION` per release so the status/ops endpoints report it.
- After deploy, run the smoke checks in [DEPLOYMENT_VERIFICATION.md](../DEPLOYMENT_VERIFICATION.md).

## Deploying anywhere (server, container, or platform)

The app ships as two Docker images (`backend/Dockerfile`, `frontend/Dockerfile`,
currently built/tagged `v1.0.0`) plus `docker-compose.prod.yml`. There's no
AWS/Cognito-specific requirement to deploy it — pick whichever of these fits:

1. **Any container platform** (Fly.io, Render, Railway, ECS/Cloud Run, a K8s
   cluster, etc.): push the images to a registry, then run each service with
   the env vars from `backend/.env.example` / `frontend/.env.example`:
   ```bash
   docker tag oraone-backend:v1.0.0 <registry>/oraone-backend:v1.0.0
   docker push <registry>/oraone-backend:v1.0.0
   # same for oraone-frontend
   ```
   The backend needs a reachable Postgres (with `pgvector`) and, optionally,
   Redis; the frontend only needs `REACT_APP_API_URL` set at **build** time
   (it's a static bundle, baked in, not read at runtime).
2. **A single VPS/dedicated server with Docker**: copy the repo, fill in
   `backend/.env`, and run `docker compose -f docker-compose.prod.yml up -d
   --build`. Put nginx/Caddy/Traefik in front for TLS.
3. **A bare server without Docker**: follow [LOCAL_SETUP.md](../LOCAL_SETUP.md)
   §§1-7 (venv + `alembic upgrade head` + `uvicorn`), run `uvicorn` under a
   process supervisor (systemd/pm2/supervisord) instead of `--reload`, build
   the frontend once (`yarn build`) and serve `frontend/build/` as static
   files behind nginx.

In every case: set `ENVIRONMENT=production`, a real `CORS_ORIGINS` (never
`*`), and either a working Cognito pool or `LOCAL_AUTH_ENABLED=true` only for
non-production/staging use.

## Backups & disaster recovery

- **Database:** use your host's automated backups (RDS snapshots, managed
  Postgres snapshots, or `pg_dump` on a cron for self-hosted) with
  point-in-time recovery where available.
- **Prove restores work — don't just trust the backup job.** Run
  `python backend/scripts/backup_restore_drill.py` periodically (cron/CI):
  it `pg_dump`s the live DB, restores into a throwaway `_restore_drill`
  database, compares row counts on core tables, then drops the throwaway DB.
  Exits non-zero on any mismatch so it can gate a deploy or page on-call.
  Verified locally: dump → restore → row counts for `users`/`agents`/
  `conversations`/`organizations` matched exactly, pgvector extension and
  `alembic_version` were both intact in the restored copy.
- **Object storage:** enable versioning on the uploads bucket/volume so
  documents can be recovered.
- **Secrets:** store `SECRET_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`, provider and
  Stripe keys in a secrets manager — never in source control. Rotating
  `INTEGRATIONS_ENCRYPTION_KEY` invalidates stored integration credentials, which
  must then be re-connected.

## Scaling notes

- The backend is stateless apart from the database and object storage — scale it
  horizontally behind a load balancer using `GET /api/health` as the target.
- Postgres is the primary bottleneck; scale vertically and add read capacity as
  needed. pgvector similarity search benefits from appropriate indexes.
- API throughput is naturally bounded per key by `api_rpm`; raise customer tiers
  rather than removing limits.

## Security operations

- Keep `CORS_ORIGINS` restricted to known domains.
- Rotate API keys and provider credentials on a schedule and on suspected leak.
- Review audit logs for privileged actions.
- Protect the `main` branch (required PR review + passing CI) and restrict who
  can trigger manual deploy workflows.
