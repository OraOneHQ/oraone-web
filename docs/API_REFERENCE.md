# OraOne API Reference

The OraOne public REST API lets you manage agents, chat, knowledge, search,
workflows and usage programmatically.

- **Base URL (production):** `https://api.oraone.in/v1`
- **Base path (server):** `/api/v1`
- **Format:** JSON request and response bodies.
- **OpenAPI schema:** `GET /openapi.json` (also linked from **Developers** in the dashboard).

> The public API (`/api/v1`) is authenticated with **API keys** and is separate
> from the dashboard API (which uses Cognito JWTs and the `X-Project-Id` header)
> and the public **widget** API (`/api/widget/*`, authenticated with a widget key).

## Authentication

Every request must include your API key as a Bearer token:

```http
Authorization: Bearer sk_ora_xxxxxxxx
```

Create and scope keys in **Developers** (`/app/developers`). Keys carry scoped
permissions — request only what you need. Available scopes include:

`chat:read`, `chat:write`, `agents:read`, `knowledge:read`, `documents:read`,
`websites:read`, `search:read`, `widgets:read`, `widgets:manage`,
`integrations:read`, `integrations:manage`, `workflows:read`,
`workflows:execute`, `analytics:read`, `usage:read`, `webhooks:manage`.

A request with a key that lacks the required scope returns `403 Forbidden`.

## Rate limits

API requests are limited per key based on your plan's **requests-per-minute**
(`api_rpm`). When exceeded, the API returns `429 Too Many Requests`. See
[Plans & Limits](PLANS_AND_LIMITS.md) for per-tier values. The Free tier has no
API access (`api_rpm = 0`).

## Errors

Errors use standard HTTP status codes with a JSON body:

```json
{ "detail": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Malformed request. |
| `401` | Missing or invalid API key. |
| `403` | Key lacks the required scope. |
| `402` | Plan quota exceeded (resource or daily AI-message limit). |
| `404` | Resource not found. |
| `429` | Rate limit exceeded (`api_rpm`). |
| `5xx` | Server / upstream provider error. |

## Endpoints

All paths are relative to the base (`/api/v1`).

### Health & identity

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/ping` | — | Authenticated connectivity check; echoes the calling key's org/project. |

### Agents

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/agents` | `agents:read` | List agents. Returns `{ items, total }`. |

### Chat

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `POST` | `/chat` | `chat:write` | Send a message to an agent and get a grounded reply with citations. |

```bash
curl -X POST https://api.oraone.in/v1/chat \
  -H "Authorization: Bearer $ORAONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "agent_id": "<id>", "message": "What plans do you offer?" }'
```

### Conversations

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/conversations` | `chat:read` | List conversations. |
| `GET` | `/conversations/{conversation_id}` | `chat:read` | Fetch one conversation with messages. |

### Knowledge

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/knowledge-bases` | `knowledge:read` | List knowledge bases. |
| `GET` | `/documents` | `documents:read` | List documents (filter by `knowledge_base_id`). |
| `GET` | `/websites` | `websites:read` | List crawled websites. |
| `POST` | `/search` | `search:read` | Semantic search across knowledge; returns scored passages. |

### Widgets & integrations

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/widgets` | `widgets:read` | List widgets. |
| `GET` | `/integrations` | `integrations:read` | List connected integrations. |

### Workflows

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/workflows` | `workflows:read` | List workflows. |
| `POST` | `/workflows/{workflow_id}/run` | `workflows:execute` | Trigger a workflow run (returns `202 Accepted`). |

### Usage & analytics

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/usage` | `usage:read` | Current plan + usage metrics. |
| `GET` | `/analytics/overview` | `analytics:read` | High-level analytics summary. |
| `GET` | `/analytics/{module}` | `analytics:read` | Per-module analytics. |

## Quickstart

```bash
# 1. Create a scoped key in Developers (/app/developers)
export ORAONE_API_KEY=sk_ora_xxxxxxxx

# 2. Verify connectivity
curl https://api.oraone.in/v1/ping \
  -H "Authorization: Bearer $ORAONE_API_KEY"

# 3. List your agents
curl https://api.oraone.in/v1/agents \
  -H "Authorization: Bearer $ORAONE_API_KEY"
```
