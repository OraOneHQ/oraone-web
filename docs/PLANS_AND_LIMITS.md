# Plans & Limits

OraOne enforces two kinds of limits per plan:

- **Resource limits** — how many of a thing your org may have (agents, knowledge
  bases, seats, workflows, integrations, storage).
- **Rate / throughput limits** — how fast you may call the API (`api_rpm`,
  requests per minute per key) and how many AI messages you may send per day.

A value of **Unlimited** below means no cap (`-1` internally). The catalogue
source of truth is `backend/app/services/billing_service.py`.

## Tiers

| Limit | Free | Starter | Business | Enterprise |
|-------|-----:|--------:|---------:|-----------:|
| Price (monthly) | $0 | $49 | $199 | Custom |
| Seats (users) | 2 | 10 | Unlimited | Unlimited |
| Agents | 2 | 20 | Unlimited | Unlimited |
| Knowledge bases | 1 | 10 | Unlimited | Unlimited |
| Workflows | 1 | 25 | Unlimited | Unlimited |
| Integrations | 1 | 10 | Unlimited | Unlimited |
| Storage | 500 MB | 20 GB | 500 GB | Unlimited |
| AI messages / day | 100 | Unlimited | Unlimited | Unlimited |
| **API rate limit** (`api_rpm`) | **No API access (0)** | 100 / min | 1,000 / min | Unlimited |

> Enterprise adds SSO, audit logs, custom models, custom SLAs and private
> deployment.

## How limits are enforced

Enforcement lives in `backend/app/services/usage_service.py`.

### Resource limits (`enforce_quota`)

Before creating a resource, the API calls `enforce_quota(...)`. If the org is at
its plan cap, the request fails with **`402 Payment Required`** and a message
naming the limit. Enforced on creation of:

- **Agents** — `POST /agents`
- **Knowledge bases** — `POST /knowledge-bases`
- **Workflows** — `POST /workflows`
- **Integrations** — `POST` integration create
- **Seats** — team invitations

### Daily AI messages (metered)

Each successful AI reply records one `ai_messages` unit (`record_usage`). On the
Free plan this is capped at 100/day; sending beyond the cap returns **`402`**.
Paid plans are unlimited. Usage counters reset daily.

### API rate limit (`api_rpm`)

The public API enforces a per-key, fixed-window requests-per-minute limit via
`api_key_service.enforce_rate_limit`. Exceeding it returns **`429 Too Many
Requests`**. The Free tier has `api_rpm = 0` (no public API access).

## What customers see

- **Portal** (`/app/portal`) and the usage panel show plan name, each metric's
  `used` vs `limit`, and a percentage bar.
- `GET /api/usage` returns:

```json
{
  "plan_code": "starter",
  "plan_name": "Starter",
  "metrics": [
    { "metric": "agents", "label": "Agents", "category": "resource",
      "used": 4, "limit": 20, "unlimited": false, "percent": 20 }
  ],
  "generated_at": "..."
}
```

## Handling limits gracefully

- Treat **`402`** as "upgrade required" — surface the limit name and link to
  billing.
- Treat **`429`** as "slow down" — back off and retry; respect the per-minute
  window.
