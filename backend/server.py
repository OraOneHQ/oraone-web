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
app = FastAPI(title="OraOne API", version="1.0.0")
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
@api.get("/leads", response_model=List[Lead])
async def list_leads(user: dict = Depends(get_current_user)):
    docs = await db.leads.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreateIn, user: dict = Depends(get_current_user)):
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": lead_id, "user_id": user["id"], "created_at": now, **payload.model_dump()}
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    await db.leads.delete_one({"id": lead_id, "user_id": user["id"]})
    return {"message": "Deleted"}


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
# Phase 5 — tenant-scoped business API (Postgres-backed)
from app.api.v2 import router as v2_router  # noqa: E402
app.include_router(v2_router)
# Phase 6 — full Agent CRUD (Postgres-backed)
from app.api.agents import router as agents_router  # noqa: E402
app.include_router(agents_router)
# Phase 6 — Knowledge Base foundation (Postgres + S3-ready storage)
from app.api.knowledge import router as knowledge_router  # noqa: E402
app.include_router(knowledge_router)

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
    # Auth (signup/login/seeding) is now handled by AWS Cognito — see app/api/auth/routes.py.


@app.on_event("shutdown")
async def shutdown():
    client.close()
    try:
        from app.database.session import dispose_engine
        await dispose_engine()
    except Exception:
        pass
