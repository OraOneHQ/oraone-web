"""AI Support API (Phase 4).

Per-agent support profile CRUD, the support primitives (escalation check,
summarise), and full ticket lifecycle (create from a call/transcript, list,
get, update/resolve).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import (
    SupportProfile,
    TicketPriority,
    TicketStatus,
    VoiceCall,
    VoiceTicket,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    EscalationCheckRequest,
    SummarizeRequest,
    SupportProfileRead,
    SupportProfileUpsert,
    TicketCreate,
    TicketListResponse,
    TicketRead,
    TicketUpdate,
)
from app.services.audit import audit
from app.services.voice.support import (
    call_summarizer,
    escalation_evaluator,
    ticket_drafter,
)

router = APIRouter(tags=["voice-support"])


async def _agent(db: AsyncSession, agent_id: uuid.UUID, org_id: uuid.UUID) -> Agent:
    agent = await db.scalar(
        select(Agent)
        .where(Agent.id == agent_id)
        .where(Agent.organization_id == org_id)
        .where(Agent.deleted_at.is_(None))
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return agent


async def _profile(db: AsyncSession, agent_id: uuid.UUID) -> SupportProfile | None:
    return await db.scalar(select(SupportProfile).where(SupportProfile.agent_id == agent_id))


# ───────────────────────────── profile ─────────────────────────────

@router.get("/api/agents/{agent_id}/support", response_model=SupportProfileRead)
async def get_support_profile(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Support profile not configured.")
    return profile


@router.put("/api/agents/{agent_id}/support", response_model=SupportProfileRead)
async def upsert_support_profile(
    agent_id: uuid.UUID,
    payload: SupportProfileUpsert,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    if profile is None:
        profile = SupportProfile(organization_id=ctx.organization_id, agent_id=agent_id)
        db.add(profile)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)
    await db.commit()
    await db.refresh(profile)
    audit(
        "update", resource="support_profile", resource_id=str(profile.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return profile


# ───────────────────────────── primitives ─────────────────────────────

@router.post("/api/agents/{agent_id}/support/escalation-check")
async def escalation_check(
    agent_id: uuid.UUID,
    payload: EscalationCheckRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)
    rules = profile.escalation_rules if profile else []
    decision = escalation_evaluator.evaluate(
        payload.text, rules=rules, sentiment=payload.sentiment,
        intent=payload.intent, repeat_count=payload.repeat_count,
    )
    return decision.as_dict()


@router.post("/api/agents/{agent_id}/support/summarize")
async def summarize_call(
    agent_id: uuid.UUID,
    payload: SummarizeRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    summary = call_summarizer.summarize(
        payload.text, resolved=payload.resolved, category=payload.category,
    )
    return summary.as_dict()


# ───────────────────────────── tickets ─────────────────────────────

@router.post("/api/agents/{agent_id}/support/tickets", response_model=TicketRead, status_code=201)
async def create_ticket(
    agent_id: uuid.UUID,
    payload: TicketCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _profile(db, agent_id)

    # Draft from transcript when explicit fields are not supplied.
    draft = ticket_drafter.draft(
        payload.text or "",
        priority=payload.priority or TicketPriority.normal,
        category=payload.category,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
    )
    subject = payload.subject or draft.subject
    body = payload.body or draft.body
    category = payload.category or draft.category
    priority = payload.priority or draft.priority

    sla_due_at = None
    if profile and profile.sla_minutes:
        sla_due_at = datetime.now(timezone.utc) + timedelta(minutes=profile.sla_minutes)

    ticket = VoiceTicket(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=agent_id,
        call_id=payload.call_id,
        subject=subject or "Support enquiry",
        body=body,
        category=category,
        priority=priority,
        status=TicketStatus.open,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        sla_due_at=sla_due_at,
        external_provider=profile.ticketing_provider if profile else None,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    audit(
        "create", resource="voice_ticket", resource_id=str(ticket.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return ticket


@router.get("/api/voice/tickets", response_model=TicketListResponse)
async def list_tickets(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    agent_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VoiceTicket).where(VoiceTicket.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(VoiceTicket.status == status_filter)
    if priority:
        stmt = stmt.where(VoiceTicket.priority == priority)
    if agent_id:
        stmt = stmt.where(VoiceTicket.agent_id == agent_id)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(desc(VoiceTicket.created_at)).limit(limit).offset(offset)
    )
    return TicketListResponse(items=list(rows.all()), total=int(total or 0))


@router.get("/api/voice/tickets/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(VoiceTicket)
        .where(VoiceTicket.id == ticket_id)
        .where(VoiceTicket.organization_id == ctx.organization_id)
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return ticket


@router.patch("/api/voice/tickets/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(VoiceTicket)
        .where(VoiceTicket.id == ticket_id)
        .where(VoiceTicket.organization_id == ctx.organization_id)
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    data = payload.model_dump(exclude_unset=True)
    for field_name, value in data.items():
        setattr(ticket, field_name, value)
    if data.get("status") == TicketStatus.escalated:
        ticket.escalated = True
    if data.get("status") in (TicketStatus.resolved, TicketStatus.closed) and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ticket)
    audit(
        "update", resource="voice_ticket", resource_id=str(ticket.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return ticket
