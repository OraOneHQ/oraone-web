"""Knowledge API package (Phase 6 — Knowledge Base Foundation)."""
from app.api.knowledge.routes import router
from app.api.knowledge.organization import router as knowledge_org_router

__all__ = ["router", "knowledge_org_router"]
