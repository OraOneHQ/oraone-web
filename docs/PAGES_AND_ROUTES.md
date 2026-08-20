# OraOne — Pages & Routes Reference

Every front-end route registered in `frontend/src/App.js`, grouped by area.
"Auth" column: **Public** (no login), **Guest-only** (redirects away if
already logged in), **User** (any authenticated account), **Admin**
(platform admin allow-list only, see `PLATFORM_ADMIN_EMAILS`).

This is a live reference — regenerate/update it whenever routes are added,
removed, or redirected in `App.js`.

---

## 1. Marketing (public, `MarketingLayout`)

| Route | Page | Auth |
|---|---|---|
| `/` | Home | Public |
| `/products` | Products | Public |
| `/solutions` | Solutions | Public |
| `/integrations` | Integrations (marketing) | Public |
| `/templates` | Templates | Public |
| `/pricing` | Pricing | Public |
| `/documentation` | Documentation | Public |
| `/case-studies` | Case Studies | Public |
| `/about` | About | Public |
| `/contact` | Contact (posts to `/api/contact`) | Public |
| `/security` | Security | Public |
| `/privacy` | Privacy Policy | Public |
| `/terms` | Terms of Service | Public |
| `/cookie-policy` | Cookie Policy | Public |
| `/data-deletion` | Data Deletion | Public |
| `/ai-chat-agent` | SEO landing — AI Chat Agent | Public |
| `/ai-whatsapp-agent` | SEO landing — AI WhatsApp Agent | Public |
| `/ai-lead-generation` | SEO landing — AI Lead Generation | Public |
| `/ai-appointment-booking` | SEO landing — AI Appointment Booking | Public |
| `/ai-customer-support` | SEO landing — AI Customer Support | Public |

## 2. System / error pages (public)

| Route | Page |
|---|---|
| `/500` | Server Error |
| `/network-error` | Network Error |
| `/maintenance` | Maintenance |
| `/__loaders` | Loader/skeleton showcase (internal QA) |
| `*` (any unmatched path) | 404 Not Found |

## 3. Design-direction demos (internal review only, not linked from the product)

`/demo1` … `/demo8` — standalone, self-themed exploratory pages.

## 4. Auth (public / guest-only, `AuthShell`)

| Route | Page | Auth |
|---|---|---|
| `/login` | Login | Guest-only |
| `/signup` | Sign up | Guest-only |
| `/verify-email` (alias `/verification`) | Email verification (6-digit code) | Public |
| `/forgot-password` | Request password reset code | Guest-only |
| `/reset-password` | Submit code + new password | Guest-only |
| `/welcome` | Post-signup welcome | User |
| `/auth/callback` | OAuth callback landing (redirects to `/login`) | Public |

## 5. Onboarding (first-run wizard, `OnboardingLayout`, `User`)

| Route | Page |
|---|---|
| `/onboarding` | Redirects to `/onboarding/agent` |
| `/onboarding/agent` | Step 1 — create your first agent |
| `/onboarding/business` | Step 2 — business profile |
| `/onboarding/channels` | Step 3 — connect channels (calls `POST /api/onboarding/complete`) |

## 6. Public, unauthenticated share links

| Route | Page |
|---|---|
| `/share/:token` | Read-only shared conversation transcript |

---

## 7. Dashboard (`DashboardLayout`, prefix `/app`, `User`)

### Home
| Route | Page |
|---|---|
| `/app` | Redirects to `/app/dashboard` |
| `/app/dashboard` (alias `/app/overview`) | Overview |

### Agents
| Route | Page |
|---|---|
| `/app/create-agent` | Create Agent wizard |
| `/app/agents` | Agents list |
| `/app/agents/new` | New agent (quick create) |
| `/app/agents/templates` | Agent template marketplace |
| `/app/agents/assistants` | Assistants hub |
| `/app/agents/versions` | Agent prompt version history |
| `/app/agents/quality` | Agent quality lab |
| `/app/agents/:id` | Agent builder (edit one agent) |
| `/app/agents/:id/deploy` | Deploy/embed one agent |

### Conversations
| Route | Page |
|---|---|
| `/app/chat` (+ `/app/chat/:conversationId`) | Live chat console |
| `/app/conversations` | Conversation history/inbox |

### Knowledge base
| Route | Page |
|---|---|
| `/app/knowledge-base` | Knowledge base list |
| `/app/knowledge-base/websites` | Website crawl sources |
| `/app/knowledge-base/search` | Knowledge search/debug tool |
| `/app/knowledge-base/coverage` | Knowledge coverage report |
| `/app/knowledge-base/:id` | Knowledge base detail |

### Integrations & CRM
| Route | Page |
|---|---|
| `/app/integrations` | Integrations dashboard |
| `/app/leads` (alias `/app/contacts`) | Leads / CRM |

### Collaboration
| Route | Page |
|---|---|
| `/app/projects` | Projects (workspace switcher) |
| `/app/activity` | Activity feed |
| `/app/notifications` | Notifications |
| `/app/invite/:token` | Accept a team invite |

### Product resources
| Route | Page |
|---|---|
| `/app/getting-started` | Getting Started checklist |
| `/app/portal` | Customer/help portal |
| `/app/changelog` | Changelog |
| `/app/status` | System status |
| `/app/feature-requests` | Feature request board |

### Deprecated / consolidated routes (kept as redirects for old links/bookmarks)
These routes exist only to redirect — the underlying pages were merged into
the routes above or are not currently exposed:

| Old route | Redirects to |
|---|---|
| `/app/marketplace` | `/app/agents/templates` |
| `/app/assistants` | `/app/agents/assistants` |
| `/app/agent-versions` | `/app/agents/versions` |
| `/app/quality-lab` | `/app/agents/quality` |
| `/app/websites` | `/app/knowledge-base/websites` |
| `/app/knowledge-search` | `/app/knowledge-base/search` |
| `/app/knowledge-coverage` | `/app/knowledge-base/coverage` |
| `/app/analytics/*`, `/app/automation/*`, `/app/settings/*`, `/app/workflows`, `/app/deploy`, `/app/widgets`, `/app/optimization-score`, `/app/revenue-attribution`, `/app/customer-360`, `/app/billing`, `/app/usage`, `/app/api-keys`, `/app/webhooks`, `/app/developers`, `/app/ai-models`, `/app/branding`, `/app/audit-logs`, `/app/operations`, `/app/team`, `/app/workspace`, `/app/teams`, `/app/tasks` | `/app/dashboard` |
| `/dashboard`, `/dashboard/*` | `/app/dashboard` |
| `/agents`, `/agents/*` | `/app/agents` |
| `/settings`, `/settings/*` | `/app/dashboard` |
| `/analytics`, `/analytics/*` | `/app/dashboard` |
| `/integrations-dashboard`, `/integrations/*` | `/app/integrations` |

> These self-service surfaces (billing, team management, API keys, webhooks,
> analytics, settings, branding, audit logs) are **not currently reachable in
> the UI** — they redirect to the dashboard home. The backend APIs behind
> most of them still exist (see `docs/API_REFERENCE.md`); re-enabling any of
> these is a routing + nav change, not a backend rebuild.

---

## 8. Super Admin Control Center (`AdminLayout`, prefix `/admin`, `Admin` — platform-admin allow-list only)

| Route | Page |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/search` | Universal search |
| `/admin/copilot` | Ora Copilot (internal AI assistant) |
| `/admin/reports` | Reports |
| `/admin/monitoring` | Monitoring |
| `/admin/analytics` | Platform analytics |
| `/admin/insights` | Insights |
| `/admin/customers` | Customers |
| `/admin/workspaces` | Workspaces (resource browser) |
| `/admin/conversations` | Conversations (cross-tenant) |
| `/admin/leads` | Leads (resource browser) |
| `/admin/support` | Support module |
| `/admin/agents` | Agents (resource browser) |
| `/admin/knowledge` | Knowledge (resource browser) |
| `/admin/workflows` | Workflows (resource browser) |
| `/admin/channels` | Channels (resource browser) |
| `/admin/billing` | Billing |
| `/admin/subscriptions` | Subscriptions |
| `/admin/usage` | Usage |
| `/admin/cost` | Cost optimization |
| `/admin/quality` | Quality |
| `/admin/self-improvement` | Self-improvement |
| `/admin/benchmarking` | Benchmarking |
| `/admin/health` | Health monitor |
| `/admin/integrations` | Integrations (resource browser) |
| `/admin/api-keys` | API keys (resource browser) |
| `/admin/infrastructure` | Infrastructure |
| `/admin/products` | Products |
| `/admin/databases` | Databases module |
| `/admin/queues` | Queues module |
| `/admin/deployments` | Deployments |
| `/admin/releases` | Releases |
| `/admin/feature-flags` | Feature flags |
| `/admin/logs` | Logs |
| `/admin/audit-logs` | Audit logs |
| `/admin/alerts` | Alerts module |
| `/admin/security` | Security |
| `/admin/secrets` | Secrets |
| `/admin/fraud` | Fraud |
| `/admin/compliance` | Compliance |
| `/admin/tenant-isolation` | Tenant isolation |
| `/admin/ai-operations` | AI operations module |
| `/admin/backups` | Backups module |
| `/admin/disaster-recovery` | Disaster recovery module |
| `/admin/settings` | Settings module |
| `/admin/developer` | Developer module |

---

## Notes for maintainers

- Route source of truth: `frontend/src/App.js`.
- Layouts: `MarketingLayout` (public), `AuthShell`/`AuthLayout` (auth pages),
  `OnboardingLayout`, `DashboardLayout` (`/app`), `AdminLayout` (`/admin`).
- `ProtectedRoute` / `GuestRoute` (`frontend/src/components/ProtectedRoute.jsx`)
  enforce the Auth column above at the router level; the backend
  independently re-checks on every API call (JWT bearer/cookie, see
  `app/middleware/jwt_auth.py`) — the frontend route guard is a UX
  convenience, not a security boundary.
- Admin access additionally requires the caller's email to be in
  `PLATFORM_ADMIN_EMAILS` (checked server-side, see
  `app/api/super_admin/deps.py`).
