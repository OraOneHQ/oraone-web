"""Voice analytics & supervisor API (Phase 7).

Aggregate, supervisor-grade reporting computed live from ``voice_calls`` plus
the in-memory/Redis session manager for the real-time view. All endpoints are
project-scoped and read-only. Numbers are derived on the fly (no rollup tables
yet) which is fine at current volumes and keeps the data always-fresh; a
materialised rollup can slot in later behind the same response shapes.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import CallStatus, VoiceCall
from app.database.session import get_db
from app.middleware.project_context import ProjectContext, get_current_project
from app.services.voice.session import get_session_manager

router = APIRouter(tags=["voice-analytics"])

_FAILED_STATUSES = [CallStatus.failed, CallStatus.no_answer, CallStatus.busy]


def _window(days: int):
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("/api/voice/analytics/overview")
async def analytics_overview(
    days: int = Query(default=7, ge=1, le=365),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Headline KPIs for the selected window."""
    scope = (VoiceCall.organization_id == pctx.organization_id) & (
        VoiceCall.project_id == pctx.project_id
    )
    since = _window(days)
    win = scope & (VoiceCall.created_at >= since)

    row = (await db.execute(
        select(
            func.count().label("total"),
            func.coalesce(func.sum(case((VoiceCall.status == CallStatus.completed, 1), else_=0)), 0).label("completed"),
            func.coalesce(func.sum(case((VoiceCall.status.in_(_FAILED_STATUSES), 1), else_=0)), 0).label("failed"),
            func.coalesce(func.sum(case((VoiceCall.status == CallStatus.transferred, 1), else_=0)), 0).label("transferred"),
            func.coalesce(func.sum(case((VoiceCall.resolution == "ai_resolved", 1), else_=0)), 0).label("ai_resolved"),
            func.coalesce(func.sum(case((VoiceCall.resolution == "voicemail", 1), else_=0)), 0).label("voicemail"),
            func.coalesce(func.avg(VoiceCall.duration_seconds), 0.0).label("avg_duration"),
            func.coalesce(func.sum(VoiceCall.duration_seconds), 0).label("total_duration"),
            func.coalesce(func.sum(VoiceCall.cost), 0.0).label("total_cost"),
            func.coalesce(func.sum(VoiceCall.tokens), 0).label("total_tokens"),
        ).where(win)
    )).one()

    avg_latency = await db.scalar(
        select(func.coalesce(func.avg(VoiceCall.avg_latency_ms), 0.0)).where(
            win, VoiceCall.avg_latency_ms > 0
        )
    ) or 0.0

    total = int(row.total or 0)
    denom = total or 1
    return {
        "window_days": days,
        "total_calls": total,
        "completed": int(row.completed),
        "failed": int(row.failed),
        "transferred": int(row.transferred),
        "ai_resolved": int(row.ai_resolved),
        "voicemail": int(row.voicemail),
        "answer_rate": round((total - int(row.failed)) / denom, 4),
        "ai_resolution_rate": round(int(row.ai_resolved) / denom, 4),
        "human_transfer_rate": round(int(row.transferred) / denom, 4),
        "avg_duration_seconds": round(float(row.avg_duration), 1),
        "total_duration_seconds": int(row.total_duration),
        "avg_latency_ms": round(float(avg_latency), 1),
        "total_cost": round(float(row.total_cost), 4),
        "total_tokens": int(row.total_tokens),
        "avg_cost_per_call": round(float(row.total_cost) / denom, 4),
    }


@router.get("/api/voice/analytics/timeseries")
async def analytics_timeseries(
    days: int = Query(default=14, ge=1, le=365),
    bucket: str = Query(default="day", pattern="^(hour|day|week)$"),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Call volume bucketed over time (calls / completed / failed / transferred)."""
    scope = (VoiceCall.organization_id == pctx.organization_id) & (
        VoiceCall.project_id == pctx.project_id
    )
    since = _window(days)
    bucket_col = func.date_trunc(bucket, VoiceCall.created_at).label("bucket")
    rows = (await db.execute(
        select(
            bucket_col,
            func.count().label("calls"),
            func.coalesce(func.sum(case((VoiceCall.status == CallStatus.completed, 1), else_=0)), 0).label("completed"),
            func.coalesce(func.sum(case((VoiceCall.status.in_(_FAILED_STATUSES), 1), else_=0)), 0).label("failed"),
            func.coalesce(func.sum(case((VoiceCall.status == CallStatus.transferred, 1), else_=0)), 0).label("transferred"),
            func.coalesce(func.avg(VoiceCall.duration_seconds), 0.0).label("avg_duration"),
            func.coalesce(func.sum(VoiceCall.cost), 0.0).label("cost"),
        )
        .where(scope, VoiceCall.created_at >= since)
        .group_by(bucket_col)
        .order_by(bucket_col)
    )).all()
    return {
        "bucket": bucket,
        "window_days": days,
        "points": [
            {
                "ts": r.bucket.isoformat() if r.bucket else None,
                "calls": int(r.calls),
                "completed": int(r.completed),
                "failed": int(r.failed),
                "transferred": int(r.transferred),
                "avg_duration_seconds": round(float(r.avg_duration), 1),
                "cost": round(float(r.cost), 4),
            }
            for r in rows
        ],
    }


async def _distribution(db, scope, column, since):
    rows = (await db.execute(
        select(column.label("key"), func.count().label("count"))
        .where(scope, VoiceCall.created_at >= since)
        .group_by(column)
        .order_by(desc(func.count()))
    )).all()
    return [{"key": r.key or "unknown", "count": int(r.count)} for r in rows]


@router.get("/api/voice/analytics/intents")
async def analytics_intents(
    days: int = Query(default=30, ge=1, le=365),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    scope = (VoiceCall.organization_id == pctx.organization_id) & (
        VoiceCall.project_id == pctx.project_id
    )
    return {"intents": await _distribution(db, scope, VoiceCall.detected_intent, _window(days))}


@router.get("/api/voice/analytics/outcomes")
async def analytics_outcomes(
    days: int = Query(default=30, ge=1, le=365),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    scope = (VoiceCall.organization_id == pctx.organization_id) & (
        VoiceCall.project_id == pctx.project_id
    )
    since = _window(days)
    return {
        "resolutions": await _distribution(db, scope, VoiceCall.resolution, since),
        "sentiment": await _distribution(db, scope, VoiceCall.sentiment, since),
        "languages": await _distribution(db, scope, VoiceCall.detected_language, since),
    }


@router.get("/api/voice/analytics/agents")
async def analytics_agents(
    days: int = Query(default=30, ge=1, le=365),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Per-agent leaderboard."""
    scope = (VoiceCall.organization_id == pctx.organization_id) & (
        VoiceCall.project_id == pctx.project_id
    )
    since = _window(days)
    rows = (await db.execute(
        select(
            VoiceCall.agent_id,
            Agent.name,
            func.count().label("calls"),
            func.coalesce(func.sum(case((VoiceCall.resolution == "ai_resolved", 1), else_=0)), 0).label("ai_resolved"),
            func.coalesce(func.sum(case((VoiceCall.status == CallStatus.transferred, 1), else_=0)), 0).label("transferred"),
            func.coalesce(func.avg(VoiceCall.duration_seconds), 0.0).label("avg_duration"),
            func.coalesce(func.avg(VoiceCall.avg_latency_ms), 0.0).label("avg_latency"),
            func.coalesce(func.sum(VoiceCall.cost), 0.0).label("cost"),
        )
        .select_from(VoiceCall)
        .join(Agent, Agent.id == VoiceCall.agent_id, isouter=True)
        .where(scope, VoiceCall.created_at >= since)
        .group_by(VoiceCall.agent_id, Agent.name)
        .order_by(desc(func.count()))
    )).all()
    out = []
    for r in rows:
        calls = int(r.calls)
        out.append({
            "agent_id": str(r.agent_id) if r.agent_id else None,
            "agent_name": r.name or "Unknown",
            "calls": calls,
            "ai_resolved": int(r.ai_resolved),
            "transferred": int(r.transferred),
            "ai_resolution_rate": round(int(r.ai_resolved) / (calls or 1), 4),
            "avg_duration_seconds": round(float(r.avg_duration), 1),
            "avg_latency_ms": round(float(r.avg_latency), 1),
            "cost": round(float(r.cost), 4),
        })
    return {"agents": out}


@router.get("/api/voice/analytics/live")
async def analytics_live(
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Real-time supervisor view of in-flight calls."""
    org_id = str(pctx.organization_id)
    mgr = get_session_manager()
    sessions = await mgr.list_active()
    live = []
    for s in sessions:
        if s.organization_id and s.organization_id != org_id:
            continue
        live.append({
            "session_id": s.id,
            "call_id": s.call_id,
            "agent_id": s.agent_id,
            "state": s.state,
            "direction": s.direction,
            "caller_number": s.caller_number,
            "receiver_number": s.receiver_number,
            "language": s.language,
            "duration_seconds": s.duration_seconds,
            "avg_latency_ms": s.avg_latency_ms,
            "turns": len(s.turns),
            "intent": s.meta.get("intent") if isinstance(s.meta, dict) else None,
        })
    return {"live_calls": len(live), "calls": live}
