from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# Cognito auth router (new modular auth foundation)
from app.api.auth.routes import router as cognito_auth_router
from app.api.contact import register_contact_routes
from app.api.dashboard import register_dashboard_routes
from app.middleware.jwt_auth import get_current_user_claims


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def get_current_user(request: Request) -> dict:
    """Compatibility adapter for legacy route handlers.

    Enforces Cognito JWT validation through shared middleware and returns
    the user shape expected by existing server.py routes.
    """
    claims = await get_current_user_claims(request)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims")
    return {
        "id": user_id,
        "email": claims.get("email", ""),
    }


# Agents
AgentType = Literal["voice", "chat", "whatsapp"]


class AgentCreateIn(BaseModel):
    name: str
    type: AgentType
    business_name: Optional[str] = None
    language: Optional[str] = "English (US)"
    voice: Optional[str] = "Aria (Female)"
    greeting: Optional[str] = "Hi! How can I help you today?"
    website_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    phone_number: Optional[str] = None
    instructions: Optional[str] = None
    business_hours: Optional[str] = "24/7"
    widget_position: Optional[str] = "Bottom Right"
    theme_color: Optional[str] = "#2563EB"


class AgentUpdateIn(AgentCreateIn):
    status: Optional[Literal["active", "paused", "draft"]] = None


class Agent(BaseModel):
    id: str
    user_id: str
    name: str
    type: AgentType
    status: str = "active"
    business_name: Optional[str] = None
    language: Optional[str] = None
    voice: Optional[str] = None
    greeting: Optional[str] = None
    website_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    phone_number: Optional[str] = None
    instructions: Optional[str] = None
    business_hours: Optional[str] = None
    widget_position: Optional[str] = None
    theme_color: Optional[str] = None
    conversations: int = 0
    success_rate: int = 0
    created_at: str


# Leads
class LeadCreateIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "website"
    intent: Optional[str] = None
    status: str = "new"
    score: int = 0
    notes: Optional[str] = None


class Lead(LeadCreateIn):
    id: str
    user_id: str
    created_at: str


# Business profile
class BusinessProfileIn(BaseModel):
    company_name: str
    industry: str
    phone: Optional[str] = None
    website: Optional[str] = None
    email: Optional[EmailStr] = None


# ---------- App ----------
app = FastAPI(title="OraOne API", version="2.0.0")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "OraOne API v1", "tagline": "One AI. Every Conversation."}


@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ---------- Auth endpoints ----------
# Auth is now handled by AWS Cognito + DynamoDB — see app/api/auth/routes.py.
# All /api/auth/* endpoints are mounted from cognito_auth_router at the bottom of
# this file (signup, verify, resend, login, forgot-password, reset-password,
# logout, me).


# ---------- Onboarding ----------
@api.post("/onboarding/complete")
async def complete_onboarding(payload: BusinessProfileIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "onboarded": True,
            "company_name": payload.company_name,
            "industry": payload.industry,
            "phone": payload.phone,
            "website": payload.website,
            "business_email": payload.email,
        }},
    )
    return {"message": "Onboarding complete"}


# ---------- Agents ----------
# Agent CRUD has moved to /app/backend/app/api/agents/routes.py (Phase 6).
# The new routes are Postgres-backed, org-scoped (Phase 5), soft-deletable,
# paginated, searchable, filterable, and audit-logged. The router is mounted
# below alongside the other v2 surfaces.


# ---------- Leads ----------
# Legacy Mongo-backed /leads endpoints have been removed. Leads (CRM) are now
# served by the Postgres-backed, project-scoped router mounted below
# (app/api/leads/routes.py) — GET/POST/PATCH/DELETE /api/leads + /api/leads/stats.


# ---------- Contact (marketing) ----------
register_contact_routes(api, db)


# ---------- Stats / dashboard overview ----------
register_dashboard_routes(api, db, get_current_user)


# ---------- Mount + middleware ----------
app.include_router(api)
# Postgres health probe (separate router, no auth)
from app.api.health import router as health_router  # noqa: E402
app.include_router(health_router)
# AWS Cognito + DynamoDB authentication
app.include_router(cognito_auth_router)
# Projects — workspace hierarchy (Organization → Project → resources)
from app.api.projects import router as projects_router  # noqa: E402
app.include_router(projects_router)
# Phase 5 — tenant-scoped business API (Postgres-backed)
from app.api.v2 import router as v2_router  # noqa: E402
app.include_router(v2_router)
# Phase 6 — full Agent CRUD (Postgres-backed)
from app.api.agents import router as agents_router  # noqa: E402
app.include_router(agents_router)
# Phase 6 — Knowledge Base foundation (Postgres + S3-ready storage)
from app.api.knowledge import router as knowledge_router  # noqa: E402
app.include_router(knowledge_router)
# R2 — Enterprise Knowledge: folders, search, preview, versions, bulk actions
from app.api.knowledge import knowledge_org_router  # noqa: E402
app.include_router(knowledge_org_router)

from app.api.knowledge import knowledge_sources_router  # noqa: E402
app.include_router(knowledge_sources_router)
# Phase 8 — AI Chat & Agent Runtime (conversations, messages, SSE streaming)
from app.api.chat import router as chat_router  # noqa: E402
app.include_router(chat_router)
# R1 — Enterprise Chat: folders + public share view
from app.api.chat import folders_router as chat_folders_router  # noqa: E402
from app.api.chat import public_chat_router  # noqa: E402
app.include_router(chat_folders_router)
app.include_router(public_chat_router)
# Phase 10 — Integrations Platform (connect external apps → sync into KB)
from app.api.integrations import router as integrations_router  # noqa: E402
app.include_router(integrations_router)
# Phase 11 — Workflow Automation (chain AI + KB + agents into automations)
from app.api.workflows import router as workflows_router  # noqa: E402
app.include_router(workflows_router)
# Phase 12 — Enterprise SaaS: Billing & Subscriptions (Module 1)
from app.api.billing import router as billing_router  # noqa: E402
app.include_router(billing_router)
# Phase 12 — Enterprise SaaS: RBAC permission matrix (Module 4)
from app.api.rbac import router as rbac_router  # noqa: E402
app.include_router(rbac_router)
# Phase 12 — Enterprise SaaS: Team management (Module 3)
from app.api.team import router as team_router  # noqa: E402
app.include_router(team_router)
# Phase 12 — Enterprise SaaS: Usage metering & quotas (Module 2)
from app.api.usage import router as usage_router  # noqa: E402
app.include_router(usage_router)
# Phase 12 — Enterprise SaaS: Organization analytics (Module 6)
from app.api.analytics import router as analytics_router  # noqa: E402
app.include_router(analytics_router)
# Phase 12 — Enterprise SaaS: API platform — key management (Module 9)
from app.api.api_keys import router as api_keys_router  # noqa: E402
app.include_router(api_keys_router)
# Phase 12 — Enterprise SaaS: External programmatic API /api/v1 (Module 9)
from app.api.public_api import router as public_api_router  # noqa: E402
app.include_router(public_api_router)
# Phase 12 — Enterprise SaaS: AI model router (Module 13)
from app.api.ai_models import router as ai_models_router  # noqa: E402
app.include_router(ai_models_router)
# Phase 12 — Enterprise SaaS: White-label branding (Module 15)
from app.api.branding import router as branding_router  # noqa: E402
app.include_router(branding_router)
# Phase 12 — Enterprise SaaS: Audit log viewer (Module 5)
from app.api.audit import router as audit_router  # noqa: E402
app.include_router(audit_router)
# R3 — Enterprise Website Crawling Engine
from app.api.websites import router as websites_router  # noqa: E402
app.include_router(websites_router)
# R4 — Enterprise RAG Engine (hybrid retrieval + grounded answers)
from app.api.rag import router as rag_router  # noqa: E402
app.include_router(rag_router)
# R6 — Embedded Website Widget (admin CRUD + public domain-restricted chat)
from app.api.widgets import router as widgets_router  # noqa: E402
from app.api.widgets import public_router as widget_public_router  # noqa: E402
app.include_router(widgets_router)
app.include_router(widget_public_router)
# Phase B — Channels & Deploy (Universal Agent: one agent, every channel)
from app.api.channels import router as channels_router  # noqa: E402
app.include_router(channels_router)
# Phase M — Omnichannel inbound (WhatsApp, SMS, Telegram, Email, SDK, …)
from app.api.omnichannel import router as omnichannel_router  # noqa: E402
app.include_router(omnichannel_router)
# R7 — Developer Platform: outbound webhooks (dashboard management)
from app.api.webhooks.routes import router as webhooks_router  # noqa: E402
app.include_router(webhooks_router)
# R9 — Enterprise Team Collaboration (teams, sharing, comments, notifications, …)
from app.api.collaboration import router as collaboration_router  # noqa: E402
app.include_router(collaboration_router)
# R10 — Enterprise Security & Release Readiness (security events, system ops)
from app.api.operations import router as operations_router  # noqa: E402
app.include_router(operations_router)
# Leads (CRM) — first-class lead capture + pipeline (project-scoped)
from app.api.leads import router as leads_router  # noqa: E402
app.include_router(leads_router)
# Feature requests / feedback board (org-scoped) — ideas, bugs, feedback + voting
from app.api.feature_requests import router as feature_requests_router  # noqa: E402
app.include_router(feature_requests_router)
# Product 2 — Voice platform (channels, calls, sessions, dashboard, webhooks, media stream)
from app.api.voice import router as voice_router  # noqa: E402
from app.api.voice import campaigns_router as voice_campaigns_router  # noqa: E402
from app.api.voice import analytics_router as voice_analytics_router  # noqa: E402
from app.api.voice import sales_router as voice_sales_router  # noqa: E402
from app.api.voice import support_router as voice_support_router  # noqa: E402
from app.api.voice import workflows_router as voice_workflows_router  # noqa: E402
from app.api.voice import enterprise_router as voice_enterprise_router  # noqa: E402
from app.api.voice import production_router as voice_production_router  # noqa: E402
from app.api.voice import receptionist_ops_router as voice_receptionist_ops_router  # noqa: E402
from app.api.voice import prompt_studio_router as voice_prompt_studio_router  # noqa: E402
from app.api.voice import payments_router as voice_payments_router  # noqa: E402
from app.api.voice import documents_router as voice_documents_router  # noqa: E402
from app.api.voice import compliance_router as voice_compliance_router  # noqa: E402
app.include_router(voice_router)
app.include_router(voice_campaigns_router)
app.include_router(voice_analytics_router)
app.include_router(voice_sales_router)
app.include_router(voice_support_router)
app.include_router(voice_workflows_router)
app.include_router(voice_enterprise_router)
app.include_router(voice_production_router)
app.include_router(voice_receptionist_ops_router)
app.include_router(voice_prompt_studio_router)
app.include_router(voice_payments_router)
app.include_router(voice_documents_router)
app.include_router(voice_compliance_router)

# Phase Z — AI Marketplace
from app.api.marketplace import marketplace_router  # noqa: E402
app.include_router(marketplace_router)

# Bonus — AI assistants (meeting, QA, forecasting, personalization, A/B, copilot)
from app.api.assistants import assistants_router  # noqa: E402
app.include_router(assistants_router)

# Workspace Intelligence — optimization score, knowledge coverage, revenue
# attribution, customer 360, confidence heatmap, conversation simulator (org-scoped)
from app.api.workspace_intel import router as workspace_intel_router  # noqa: E402
app.include_router(workspace_intel_router)

from app.api.agent_versioning import router as agent_versioning_router  # noqa: E402
app.include_router(agent_versioning_router)

# Super Admin Control Center (platform-scoped, founder-only)
from app.api.super_admin import super_admin_router  # noqa: E402
app.include_router(super_admin_router)

cors_origins_env = os.environ.get('CORS_ORIGINS', '*')
allow_origins = ["*"] if cors_origins_env.strip() == "*" else [o.strip() for o in cors_origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True if allow_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Security headers ----------
@app.middleware("http")
async def security_headers_mw(request, call_next):
    response = await call_next(request)
    # Hardening — see https://owasp.org/www-project-secure-headers/
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    )
    response.headers.setdefault("X-XSS-Protection", "0")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    return response


@app.middleware("http")
async def audit_flush_mw(request, call_next):
    """Persist buffered audit records after each request (best-effort).

    Phase 12 Module 5 — drains ``app.services.audit`` into ``audit_logs``.
    Never blocks or fails the response.
    """
    response = await call_next(request)
    try:
        from app.services.audit import _PENDING, flush_pending
        if _PENDING:
            from app.database.session import AsyncSessionLocal
            if AsyncSessionLocal is not None:
                async with AsyncSessionLocal() as _s:
                    await flush_pending(_s)
    except Exception:  # noqa: BLE001 — auditing must never break a request
        pass
    return response


@app.middleware("http")
async def api_v1_access_log_mw(request, call_next):
    """R7 — record an ``api_request_logs`` row for every ``/api/v1`` call.

    Best-effort: reads ``request.state.api_ctx`` (set by the API-key auth
    dependency) for org/key attribution and never blocks or fails the
    response.
    """
    import time as _time

    is_v1 = request.url.path.startswith("/api/v1")
    start = _time.perf_counter() if is_v1 else 0.0
    response = await call_next(request)
    if not is_v1:
        return response
    try:
        latency_ms = int((_time.perf_counter() - start) * 1000)
        ctx = getattr(request.state, "api_ctx", None)
        if ctx is not None:
            from app.database.models.api_log import ApiRequestLog
            from app.database.session import AsyncSessionLocal
            if AsyncSessionLocal is not None:
                async with AsyncSessionLocal() as _s:
                    _s.add(
                        ApiRequestLog(
                            organization_id=ctx.get("organization_id"),
                            api_key_id=ctx.get("api_key_id"),
                            key_prefix=ctx.get("key_prefix"),
                            method=request.method,
                            endpoint=request.url.path[:255],
                            status_code=response.status_code,
                            latency_ms=latency_ms,
                        )
                    )
                    await _s.commit()
    except Exception:  # noqa: BLE001 — access logging must never break a request
        pass
    return response

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    try:
        await db.agents.create_index([("user_id", 1)])
        await db.leads.create_index([("user_id", 1), ("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")
    # Initialise the Postgres async engine lazily — won't crash boot if
    # the DB is unreachable (e.g. private VPC). Routes that need it will
    # fail individually with a clear error.
    try:
        from app.database.session import init_engine
        init_engine()
        logger.info("Postgres engine initialised.")
    except Exception as e:
        logger.warning(f"Postgres engine not initialised (will retry on first use): {e}")
    # Phase 11 — start the in-process workflow scheduler (best-effort).
    try:
        from app.services.workflow_scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning(f"Workflow scheduler not started: {e}")
    # Phase 12 — seed the billing plan catalogue (best-effort, idempotent).
    try:
        from app.database.session import AsyncSessionLocal
        from app.services.billing_service import ensure_plans_seeded
        if AsyncSessionLocal is not None:
            async with AsyncSessionLocal() as _s:
                await ensure_plans_seeded(_s)
    except Exception as e:
        logger.warning(f"Plan seeding skipped: {e}")
    # Auth (signup/login/seeding) is now handled by AWS Cognito — see app/api/auth/routes.py.


@app.on_event("shutdown")
async def shutdown():
    client.close()
    try:
        from app.database.session import dispose_engine
        await dispose_engine()
    except Exception:
        pass
