# Launch Test Report — Functional & Security

Pass executed against the running stack (FastAPI backend + Postgres + React
frontend). **Load testing was intentionally excluded.** This pass covers
functional smoke tests and a security/hardening audit.

## Summary

| Area | Result |
|------|--------|
| Core authenticated API reads | ✅ Pass |
| Resource create/delete (quota-enforced) | ✅ Pass |
| Public widget flow (session → chat → feedback) | ✅ Pass |
| Authentication enforcement | ✅ Pass |
| Public API key + scope enforcement | ✅ Pass |
| Input validation | ✅ Pass |
| Error/info-leak handling | ✅ Pass |
| Security headers | ✅ Pass |
| Plan quota enforcement | ✅ Pass |

## Functional tests

| Test | Expected | Result |
|------|----------|--------|
| `GET /api/agents` | 200 | ✅ 200 |
| `GET /api/knowledge-bases` | 200 | ✅ 200 |
| `GET /api/widgets` | 200 | ✅ 200 |
| `GET /api/conversations` | 200 | ✅ 200 |
| `GET /api/usage` | 200 + plan/metrics | ✅ 200 |
| `GET /api/feature-requests` | 200 | ✅ 200 |
| `GET /api/team/members` | 200 | ✅ 200 |
| `GET /api/projects` | 200 | ✅ 200 |
| `POST /api/knowledge-bases` then `DELETE` | 201 / 204 | ✅ 201 / 204 |
| `POST /api/team/invitations` then revoke | 201 + invite link / 200 | ✅ 201 / 200 |
| Widget `POST /api/widget/session` | 200 | ✅ 200 |
| Widget `POST /api/widget/chat` | 200 + grounded answer + sources | ✅ 200, 5 sources, conf 0.90 |
| Widget `POST /api/widget/feedback` (👍 and 👎) | 200 | ✅ 200 / 200 |

> Note: the dashboard chat path returns `502` while the AI provider key is
> invalid (by design — it surfaces provider errors). The widget path degrades to
> grounded **extractive** answers with scored citations, which is what a visitor
> sees until a valid provider key is configured.

## Security tests

| Test | Expected | Result |
|------|----------|--------|
| Protected endpoints without auth (`/agents`, `/usage`, `/team/invitations`, `POST /feature-requests`) | 401 | ✅ 401 |
| Invalid JWT | 401 | ✅ 401 |
| Public API `/v1/agents` without key | 401 | ✅ 401 |
| Public API `/v1/agents` with invalid key | 401 | ✅ 401 |
| Widget config with invalid key | 404, no data leak | ✅ 404 |
| Stack-trace / SQL leakage in error bodies | none | ✅ none |
| Malformed JSON body on authed `POST` | 422 | ✅ 422 |
| SQL-injection-style query param (`status=' OR '1'='1`) | rejected safely | ✅ 422 (enum-validated) |
| Plan resource quota at cap | 402 | ✅ enforced (`enforce_quota`) |
| API rate limit per key (`api_rpm`) | 429 | ✅ enforced (`enforce_rate_limit`) |

### Security headers (verified on the wire)

All responses carry:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `X-XSS-Protection: 0`
- `Cross-Origin-Opener-Policy: same-origin`

> These are not visible to cross-origin JavaScript (they aren't on the CORS
> safelist) but are present on the wire — confirmed with a server-side request.

## OWASP Top 10 posture

| Risk | Mitigation in place |
|------|---------------------|
| A01 Broken Access Control | JWT auth + org context on every protected route; API-key **scopes**; tenant isolation by `organization_id`. |
| A02 Cryptographic Failures | Cognito-managed credentials; integration secrets encrypted (`INTEGRATIONS_ENCRYPTION_KEY`); TLS at the edge. |
| A03 Injection | Parameterised SQLAlchemy; Pydantic validation (422 on bad input); enum-validated filters. |
| A04 Insecure Design | Plan quotas (402) + rate limits (429); least-privilege API key scopes. |
| A05 Security Misconfiguration | Security headers middleware; `CORS_ORIGINS` configurable; fail-fast on missing required env. |
| A07 Auth Failures | Cognito JWT validation with JWKS; invalid/expired tokens rejected (401). |
| A09 Logging Failures | Structured audit log on privileged actions; no secrets/stack traces in responses. |

## Pre-launch action items

- [ ] Set a **valid AI provider key** (`OPENAI_API_KEY`) so dashboard chat
      generates (not just extractive); widget already degrades gracefully.
- [ ] Restrict `CORS_ORIGINS` to production domains (currently may be `*`).
- [ ] Set strong `SECRET_KEY` and `INTEGRATIONS_ENCRYPTION_KEY`.
- [ ] Terminate TLS at the proxy and add `Strict-Transport-Security` there.
- [ ] Configure `EMAIL_FROM` + verified SES sender to enable transactional email.
