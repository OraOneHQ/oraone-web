"""Super Admin Control Center API (platform-scoped).

Every endpoint is gated by :func:`get_platform_admin` and therefore reads
across all tenants. Reads are audited; the only writes are feature-flag
toggles. Secrets are exposed **masked and read-only** — plaintext never
leaves the server.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.super_admin.deps import PlatformAdminContext, get_platform_admin
from app.database.session import get_db
from app.services import platform_admin as svc
from app.services import platform_assistant as assistant
from app.services import platform_intelligence as intel
from app.services.audit import audit

router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])


def _audit(admin: PlatformAdminContext, action: str, resource: str, **meta: Any) -> None:
    audit(
        action,
        resource=resource,
        organization_id="platform",
        user_id=str(admin.user_id),
        meta={"admin_email": admin.email, **meta},
    )


# --------------------------------------------------------------------------- #
# Identity / gate                                                             #
# --------------------------------------------------------------------------- #
@router.get("/me")
async def whoami(admin: PlatformAdminContext = Depends(get_platform_admin)) -> dict[str, Any]:
    return {"user_id": str(admin.user_id), "email": admin.email, "full_name": admin.full_name, "is_platform_admin": True}


# --------------------------------------------------------------------------- #
# Dashboard                                                                   #
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def get_overview(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.overview(db)


@router.get("/activity")
async def get_activity(
    limit: int = Query(40, ge=1, le=200),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await svc.activity(db, limit=limit)


# --------------------------------------------------------------------------- #
# Customers                                                                   #
# --------------------------------------------------------------------------- #
@router.get("/customers")
async def get_customers(
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _audit(admin, "read", "platform_customers", q=q)
    return await svc.customers(db, q=q, limit=limit, offset=offset)


@router.get("/customers/{org_id}")
async def get_customer_detail(
    org_id: str,
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    data = await svc.customer_detail(db, org_id)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    _audit(admin, "read", "platform_customer", resource_id=org_id)
    return data


# --------------------------------------------------------------------------- #
# Conversations                                                               #
# --------------------------------------------------------------------------- #
@router.get("/conversations")
async def get_conversations(
    q: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await svc.conversations(db, q=q, channel=channel, limit=limit)


# --------------------------------------------------------------------------- #
# Audit logs                                                                  #
# --------------------------------------------------------------------------- #
@router.get("/audit-logs")
async def get_audit_logs(
    q: Optional[str] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await svc.audit_logs(db, q=q, action=action, resource=resource, limit=limit)


# --------------------------------------------------------------------------- #
# Billing / Usage                                                             #
# --------------------------------------------------------------------------- #
@router.get("/billing")
async def get_billing(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.billing(db)


@router.get("/usage")
async def get_usage(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.usage(db)


# --------------------------------------------------------------------------- #
# Security / Infrastructure / Releases                                        #
# --------------------------------------------------------------------------- #
@router.get("/security")
async def get_security(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.security(db)


@router.get("/infrastructure")
async def get_infrastructure(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.infrastructure(db)


@router.get("/releases")
async def get_releases(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await svc.releases(db)


# --------------------------------------------------------------------------- #
# Feature flags                                                               #
# --------------------------------------------------------------------------- #
class FeatureFlagPatch(BaseModel):
    enabled: Optional[bool] = None
    rollout_percentage: Optional[int] = None


@router.get("/feature-flags")
async def get_feature_flags(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await svc.list_feature_flags(db)


@router.patch("/feature-flags/{key}")
async def patch_feature_flag(
    key: str,
    payload: FeatureFlagPatch,
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await svc.set_feature_flag(
        db, key, enabled=payload.enabled,
        rollout_percentage=payload.rollout_percentage, admin_user_id=admin.user_id,
    )
    _audit(admin, "update", "feature_flag", resource_id=key, enabled=payload.enabled, rollout=payload.rollout_percentage)
    return result


# --------------------------------------------------------------------------- #
# Secrets (masked, read-only)                                                 #
# --------------------------------------------------------------------------- #
@router.get("/secrets")
async def get_secrets(
    admin: PlatformAdminContext = Depends(get_platform_admin),
) -> dict[str, Any]:
    _audit(admin, "read", "platform_secrets")
    return svc.secrets_inventory()


# --------------------------------------------------------------------------- #
# Generic cross-tenant resource lists (agents, leads, workspaces, …)          #
# --------------------------------------------------------------------------- #
@router.get("/resources/{kind}")
async def get_resource(
    kind: str,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await svc.list_resource(db, kind, q=q, limit=limit)


# --------------------------------------------------------------------------- #
# Platform intelligence (cost / quality / self-improvement / benchmark / …)   #
# --------------------------------------------------------------------------- #
@router.get("/cost-optimization")
async def get_cost_optimization(
    days: int = Query(30, ge=1, le=90),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _audit(admin, "read", "platform_cost")
    return await intel.cost_optimization(db, days=days)


@router.get("/quality")
async def get_quality(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.quality_monitoring(db)


@router.get("/self-improvement")
async def get_self_improvement(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.self_improvement(db)


@router.get("/benchmarking")
async def get_benchmarking(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.benchmarking(db)


@router.get("/health-monitor")
async def get_health_monitor(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.health_monitor(db)


@router.get("/fraud")
async def get_fraud(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _audit(admin, "read", "platform_fraud")
    return await intel.fraud_detection(db)


@router.get("/compliance")
async def get_compliance(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.compliance(db)


@router.get("/tenant-isolation")
async def get_tenant_isolation(
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await intel.tenant_isolation(db)


# --------------------------------------------------------------------------- #
# Universal search / Ora Copilot / Report generator                           #
# --------------------------------------------------------------------------- #
@router.get("/search")
async def universal_search(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(8, ge=1, le=25),
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await assistant.universal_search(db, q=q, limit=limit)


class CopilotAsk(BaseModel):
    question: str


@router.post("/copilot")
async def ora_copilot(
    body: CopilotAsk,
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _audit(admin, "ask", "ora_copilot", question=body.question[:200])
    return await assistant.ora_copilot(db, question=body.question)


@router.get("/reports/{period}")
async def generate_report(
    period: str,
    admin: PlatformAdminContext = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _audit(admin, "generate", "platform_report", period=period)
    return await assistant.generate_report(db, period=period)

