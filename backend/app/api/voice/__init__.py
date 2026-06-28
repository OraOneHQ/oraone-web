"""Voice API package (Product 2)."""
from app.api.voice.analytics_api import router as analytics_router
from app.api.voice.campaigns import router as campaigns_router
from app.api.voice.compliance import router as compliance_router
from app.api.voice.documents import router as documents_router
from app.api.voice.enterprise import router as enterprise_router
from app.api.voice.production import router as production_router
from app.api.voice.payments import router as payments_router
from app.api.voice.prompt_studio import router as prompt_studio_router
from app.api.voice.receptionist_ops import router as receptionist_ops_router
from app.api.voice.routes import router
from app.api.voice.sales import router as sales_router
from app.api.voice.support import router as support_router
from app.api.voice.workflows import router as workflows_router

__all__ = [
    "router", "campaigns_router", "analytics_router",
    "sales_router", "support_router", "workflows_router",
    "enterprise_router", "production_router", "receptionist_ops_router",
    "prompt_studio_router", "payments_router", "documents_router",
    "compliance_router",
]
