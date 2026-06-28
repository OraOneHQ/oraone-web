"""Production Operations API (Phase 10).

Operational control plane for running Voice in production:

* **10.3 Provider resilience** — GET ``/api/voice/system/providers`` (health +
  active provider + failover chain) and POST ``.../providers/probe`` to record a
  health probe / trigger failover.
* **10.4 Cost engine** — GET ``/api/voice/system/costs`` cost KPIs + forecast.
* **10.5 Observability** — GET ``/api/voice/system/metrics`` live metrics and
  GET ``/api/voice/system/health`` readiness (db / session store / providers).
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import CallStatus, VoiceCall
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.services.voice.resilience import (
    cost_engine,
    provider_registry,
    voice_rate_limiter,
)
from app.services.voice.session import CallState, get_session_manager

router = APIRouter(tags=["voice-production"])

_CATEGORIES = {"voice", "stt", "tts", "llm"}


# ─────────────────────────── 10.3 provider resilience ────────────────────────

@router.get("/api/voice/system/providers")
async def provider_health(
    ctx: OrgContext = Depends(get_current_organization),
):
    snapshot = provider_registry.snapshot()
    return {
        "categories": snapshot,
        "active": {cat: provider_registry.active_provider(cat) for cat in snapshot},
        "failover": {cat: provider_registry.failover_chain(cat) for cat in snapshot},
    }


class ProviderProbe(BaseModel):
    category: str = Field(pattern=r"^(voice|stt|tts|llm)$")
    name: str = Field(min_length=1, max_length=60)
    healthy: bool = True
    latency_ms: float = Field(default=0.0, ge=0)
    error: Optional[str] = Field(default=None, max_length=500)


@router.post("/api/voice/system/providers/probe")
async def record_provider_probe(
    payload: ProviderProbe,
    ctx: OrgContext = Depends(get_current_organization),
):
    ph = provider_registry.record_probe(
        category=payload.category, name=payload.name,
        healthy=payload.healthy, latency_ms=payload.latency_ms, error=payload.error,
    )
    return {
        "category": ph.category,
        "name": ph.name,
        "healthy": ph.healthy,
        "failures": ph.failures,
        "active_provider": provider_registry.active_provider(payload.category),
        "failover_chain": provider_registry.failover_chain(payload.category),
    }


# ─────────────────────────────── 10.4 cost engine ────────────────────────────

@router.get("/api/voice/system/costs")
async def cost_overview(
    days: int = Query(default=30, ge=1, le=365),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    scope = (
        (VoiceCall.organization_id == pctx.organization_id)
        & (VoiceCall.project_id == pctx.project_id)
        & (VoiceCall.created_at >= since)
    )
    row = (
        await db.execute(
            select(
                func.count(VoiceCall.id).label("calls"),
                func.coalesce(func.sum(VoiceCall.duration_seconds), 0).label("seconds"),
                func.coalesce(func.sum(VoiceCall.cost), 0.0).label("cost"),
                func.coalesce(func.sum(VoiceCall.tokens), 0).label("tokens"),
            ).where(scope)
        )
    ).one()

    # Fall back to estimated cost when nothing was billed yet.
    total_cost = float(row.cost)
    if total_cost <= 0:
        total_cost = cost_engine.estimate_call_cost(
            duration_seconds=int(row.seconds), tokens=int(row.tokens), recorded_cost=0.0
        )

    # Per-day series for the dashboard.
    day_rows = (
        await db.execute(
            select(
                func.date_trunc("day", VoiceCall.created_at).label("day"),
                func.count(VoiceCall.id).label("calls"),
                func.coalesce(func.sum(VoiceCall.cost), 0.0).label("cost"),
            )
            .where(scope)
            .group_by(text("day"))
            .order_by(text("day"))
        )
    ).all()
    by_day = [
        {"day": d.day.isoformat() if d.day else None, "calls": int(d.calls), "cost": round(float(d.cost), 4)}
        for d in day_rows
    ]

    breakdown = cost_engine.summarize(
        total_calls=int(row.calls), total_seconds=int(row.seconds),
        total_cost=total_cost, window_days=days, by_day=by_day,
    )
    return {
        "window_days": days,
        "total_calls": breakdown.total_calls,
        "total_minutes": breakdown.total_minutes,
        "total_cost": breakdown.total_cost,
        "cost_per_call": breakdown.cost_per_call,
        "cost_per_minute": breakdown.cost_per_minute,
        "projected_monthly": breakdown.projected_monthly,
        "forecast_next_month": breakdown.forecast_next_month,
        "total_tokens": int(row.tokens),
        "by_day": breakdown.by_day,
    }


# ─────────────────────────────── 10.5 observability ──────────────────────────

@router.get("/api/voice/system/metrics")
async def observability_metrics(
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    mgr = get_session_manager()
    sessions = [s for s in await mgr.list_active() if str(s.organization_id) == str(pctx.organization_id)]
    active = len(sessions)
    states: dict[str, int] = {}
    latencies = []
    for s in sessions:
        states[s.state] = states.get(s.state, 0) + 1
        if s.avg_latency_ms:
            latencies.append(s.avg_latency_ms)

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    scope = (
        (VoiceCall.organization_id == pctx.organization_id)
        & (VoiceCall.project_id == pctx.project_id)
        & (VoiceCall.created_at >= since)
    )
    row = (
        await db.execute(
            select(
                func.count(VoiceCall.id).label("total"),
                func.coalesce(
                    func.sum(case((VoiceCall.status == CallStatus.failed, 1), else_=0)), 0
                ).label("failed"),
            ).where(scope)
        )
    ).one()
    total_24h = int(row.total)
    failed_24h = int(row.failed)
    error_rate = round(failed_24h / total_24h, 4) if total_24h else 0.0

    return {
        "active_calls": active,
        "calls_by_state": states,
        "queue_depth": states.get(CallState.transferring, 0),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 1) if latencies else 0.0,
        "calls_24h": total_24h,
        "failed_24h": failed_24h,
        "error_rate_24h": error_rate,
        "providers_active": {cat: provider_registry.active_provider(cat) for cat in _CATEGORIES},
    }


@router.get("/api/voice/system/health")
async def readiness(
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    checks: dict[str, dict] = {}
    overall_ok = True

    # Database.
    t0 = time.time()
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"ok": True, "latency_ms": round((time.time() - t0) * 1000, 1)}
    except Exception as e:  # noqa: BLE001
        overall_ok = False
        checks["database"] = {"ok": False, "error": str(e)[:200]}

    # Session store.
    try:
        await get_session_manager().list_active()
        checks["session_store"] = {"ok": True}
    except Exception as e:  # noqa: BLE001
        overall_ok = False
        checks["session_store"] = {"ok": False, "error": str(e)[:200]}

    # Providers — degraded (not down) if any category has no healthy provider.
    snapshot = provider_registry.snapshot()
    degraded = [
        cat for cat in snapshot
        if not any(p["healthy"] for p in snapshot[cat])
    ]
    checks["providers"] = {"ok": not degraded, "degraded_categories": degraded}

    status_label = "ok" if overall_ok else "unhealthy"
    if overall_ok and degraded:
        status_label = "degraded"
    return {"status": status_label, "checks": checks}
