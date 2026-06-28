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
- For the self-hosted GitHub Actions flow, see [SELF_HOSTED_DEPLOYMENT.md](../SELF_HOSTED_DEPLOYMENT.md)
  (includes a rollback script).

## Backups & disaster recovery

- **Database:** use managed automated backups (e.g. RDS automated snapshots) with
  point-in-time recovery. Test restores periodically.
- **Object storage:** enable S3 versioning on the uploads bucket so documents can
  be recovered.
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
- See [SELF_HOSTED_DEPLOYMENT.md](../SELF_HOSTED_DEPLOYMENT.md) §10 for runner
  hardening and branch-protection guidance.
