"""Voice API (Product 2 — Phase 1.2 + channel/profile/dashboard management).

Public (provider) endpoints
---------------------------
* ``POST /api/voice/incoming``        — Twilio inbound webhook → TwiML (media stream)
* ``POST /api/voice/status``          — Twilio status callback
* ``WS   /api/voice/stream``          — Twilio Media Streams bidirectional audio

Authenticated (dashboard) endpoints
-----------------------------------
* ``POST   /api/voice/outgoing``      — place an outbound call
* ``GET    /api/voice/calls``         — list calls (paginated/filterable)
* ``GET    /api/voice/calls/{id}``    — call detail (transcript + recordings)
* ``GET    /api/voice/sessions``      — live sessions
* ``DELETE /api/voice/session/{id}``  — end a live call/session
* ``GET    /api/voice/dashboard``     — voice dashboard metrics
* ``GET    /api/voice/config``        — provider capability flags
* ``GET/PUT /api/agents/{aid}/channels/voice`` — enable/configure the voice channel
* ``GET/PUT /api/agents/{aid}/voice-profile``  — TTS/STT profile
* ``GET/PUT /api/agents/{aid}/receptionist``   — Phase 2 receptionist config
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    WebSocket,
    status,
)
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import (
    AgentChannel,
    CallDirection,
    CallStatus,
    CallTransfer,
    ChannelStatus,
    ChannelType,
    ReceptionistProfile,
    TransferStatus,
    VoiceCall,
    VoiceMessage,
    VoiceProfile,
    VoiceRecording,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization, require_role
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    AgentChannelRead,
    AgentChannelUpsert,
    CallActionResponse,
    CallTransferRead,
    OutboundCallRequest,
    ReceptionistProfileRead,
    ReceptionistProfileUpsert,
    TransferRequest,
    VoiceCallDetail,
    VoiceCallListResponse,
    VoiceCallRead,
    VoiceDashboard,
    VoiceProfileRead,
    VoiceProfileUpsert,
    VoiceSessionRead,
)
from app.services import visitor_service
from app.services.audit import audit
from app.services.voice.analytics import VoiceEvent, record_event
from app.services.voice.config import get_voice_config
from app.services.voice.providers import StubVoiceProvider, get_provider
from app.services.voice.receptionist import (
    call_router,
    evaluate_hours,
    greeting_engine,
    intent_classifier,
)
from app.services.voice.session import CallState, get_session_manager
from app.services.voice.stream_handler import MediaStreamHandler

router = APIRouter(tags=["voice"])
log = logging.getLogger("app.voice.routes")


# ════════════════════════════ helpers ════════════════════════════

async def _agent_for_org(db: AsyncSession, agent_id: uuid.UUID, org_id: uuid.UUID) -> Agent:
    agent = await db.scalar(
        select(Agent)
        .where(Agent.id == agent_id)
        .where(Agent.organization_id == org_id)
        .where(Agent.deleted_at.is_(None))
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return agent


async def _voice_channel(db: AsyncSession, agent_id: uuid.UUID) -> Optional[AgentChannel]:
    return await db.scalar(
        select(AgentChannel)
        .where(AgentChannel.agent_id == agent_id)
        .where(AgentChannel.channel == ChannelType.voice)
    )


async def _voice_profile(db: AsyncSession, agent_id: uuid.UUID) -> Optional[VoiceProfile]:
    return await db.scalar(select(VoiceProfile).where(VoiceProfile.agent_id == agent_id))


# ════════════════════════ channel management ════════════════════════

@router.get("/api/agents/{agent_id}/channels/voice", response_model=AgentChannelRead)
async def get_voice_channel(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent_for_org(db, agent_id, ctx.organization_id)
    channel = await _voice_channel(db, agent_id)
    if channel is None:
        raise HTTPException(status_code=404, detail="Voice channel not enabled for this agent.")
    return channel


@router.put("/api/agents/{agent_id}/channels/voice", response_model=AgentChannelRead)
async def upsert_voice_channel(
    agent_id: uuid.UUID,
    payload: AgentChannelUpsert,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    agent = await _agent_for_org(db, agent_id, ctx.organization_id)
    channel = await _voice_channel(db, agent_id)
    created = channel is None
    if channel is None:
        channel = AgentChannel(
            organization_id=ctx.organization_id,
            project_id=agent.project_id or pctx.project_id,
            agent_id=agent_id,
            channel=ChannelType.voice,
        )
        db.add(channel)
    channel.enabled = payload.enabled
    if payload.status:
        channel.status = payload.status
    if payload.phone_number is not None:
        channel.phone_number = payload.phone_number
    if payload.provider is not None:
        channel.provider = payload.provider
    if payload.configuration is not None:
        channel.configuration = payload.configuration

    # Ensure a voice profile exists so the agent can actually speak.
    profile = await _voice_profile(db, agent_id)
    if profile is None:
        db.add(VoiceProfile(organization_id=ctx.organization_id, agent_id=agent_id))

    await db.commit()
    await db.refresh(channel)
    audit(
        "create" if created else "update",
        resource="voice_channel",
        resource_id=str(channel.id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
    )
    return channel


# ════════════════════════ voice profile ════════════════════════

@router.get("/api/agents/{agent_id}/voice-profile", response_model=VoiceProfileRead)
async def get_profile(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent_for_org(db, agent_id, ctx.organization_id)
    profile = await _voice_profile(db, agent_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="No voice profile configured.")
    return profile


@router.put("/api/agents/{agent_id}/voice-profile", response_model=VoiceProfileRead)
async def upsert_profile(
    agent_id: uuid.UUID,
    payload: VoiceProfileUpsert,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent_for_org(db, agent_id, ctx.organization_id)
    profile = await _voice_profile(db, agent_id)
    if profile is None:
        profile = VoiceProfile(organization_id=ctx.organization_id, agent_id=agent_id)
        db.add(profile)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)
    await db.commit()
    await db.refresh(profile)
    audit(
        "update", resource="voice_profile", resource_id=str(profile.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return profile


# ════════════════════════ receptionist (Phase 2) ════════════════════════

@router.get("/api/agents/{agent_id}/receptionist", response_model=ReceptionistProfileRead)
async def get_receptionist(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent_for_org(db, agent_id, ctx.organization_id)
    profile = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent_id)
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="No receptionist profile configured.")
    return profile


@router.put("/api/agents/{agent_id}/receptionist", response_model=ReceptionistProfileRead)
async def upsert_receptionist(
    agent_id: uuid.UUID,
    payload: ReceptionistProfileUpsert,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent_for_org(db, agent_id, ctx.organization_id)
    profile = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent_id)
    )
    if profile is None:
        profile = ReceptionistProfile(organization_id=ctx.organization_id, agent_id=agent_id)
        db.add(profile)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field_name, value)
    await db.commit()
    await db.refresh(profile)
    audit(
        "update", resource="receptionist_profile", resource_id=str(profile.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return profile


@router.get("/api/agents/{agent_id}/receptionist/greeting-preview")
async def preview_greeting(
    agent_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Preview the greeting the receptionist would speak right now."""
    await _agent_for_org(db, agent_id, ctx.organization_id)
    profile = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent_id)
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="No receptionist profile configured.")
    hours = evaluate_hours(
        profile.business_hours or {}, profile.holidays or [], profile.timezone or "UTC",
    )
    greeting, after_hours = greeting_engine.build(profile, hours=hours)
    return {
        "greeting": greeting,
        "after_hours": after_hours,
        "is_open": hours.is_open,
        "is_holiday": hours.is_holiday,
        "holiday_name": hours.holiday_name,
        "local_time": hours.local_now.isoformat(),
        "timezone": profile.timezone or "UTC",
    }


@router.post("/api/agents/{agent_id}/receptionist/test-intent")
async def test_intent(
    agent_id: uuid.UUID,
    payload: dict,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Classify a sample utterance and show the routing decision (config aid)."""
    await _agent_for_org(db, agent_id, ctx.organization_id)
    text = (payload or {}).get("text") or ""
    profile = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent_id)
    )
    result = await intent_classifier.classify(text)
    is_open = True
    if profile is not None:
        hours = evaluate_hours(
            profile.business_hours or {}, profile.holidays or [], profile.timezone or "UTC",
        )
        is_open = hours.is_open
    decision = call_router.route(
        profile, result.intent, language=result.language, is_open=is_open,
    ) if profile is not None else None
    return {
        "intent": result.intent,
        "confidence": result.confidence,
        "language": result.language,
        "reasoning": result.reasoning,
        "entities": result.entities,
        "routing": {
            "action": decision.action,
            "target": decision.target,
            "department": decision.department,
            "priority": decision.priority,
            "reason": decision.reason,
        } if decision else None,
    }


# ════════════════════════ config / capability ════════════════════════

@router.get("/api/voice/config")
async def voice_config(ctx: OrgContext = Depends(get_current_organization)):
    cfg = get_voice_config()
    return {
        "providers": {
            "twilio": cfg.twilio_configured,
            "deepgram": cfg.deepgram_configured,
            "elevenlabs": cfg.elevenlabs_configured,
        },
        "default_provider": cfg.default_provider,
        "default_stt_provider": cfg.default_stt_provider,
        "default_tts_provider": cfg.default_tts_provider,
        "phone_number": cfg.twilio_phone_number or None,
        "redis_sessions": cfg.redis_configured,
        "public_base_url": cfg.public_base_url or None,
    }


# ════════════════════════ calls (dashboard) ════════════════════════

@router.get("/api/voice/calls", response_model=VoiceCallListResponse)
async def list_calls(
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    direction: Optional[str] = Query(default=None),
    agent_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    base = (
        select(VoiceCall)
        .where(VoiceCall.organization_id == pctx.organization_id)
        .where(VoiceCall.project_id == pctx.project_id)
    )
    if status_filter:
        base = base.where(VoiceCall.status == status_filter)
    if direction:
        base = base.where(VoiceCall.direction == direction)
    if agent_id:
        base = base.where(VoiceCall.agent_id == agent_id)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    rows = list(
        (await db.scalars(
            base.order_by(desc(VoiceCall.created_at)).limit(limit).offset(offset)
        )).all()
    )
    return VoiceCallListResponse(
        items=[VoiceCallRead.model_validate(r) for r in rows],
        total=total or 0, limit=limit, offset=offset,
    )


@router.get("/api/voice/calls/{call_id}", response_model=VoiceCallDetail)
async def get_call(
    call_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    call = await db.scalar(
        select(VoiceCall)
        .where(VoiceCall.id == call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found.")
    messages = list(
        (await db.scalars(
            select(VoiceMessage).where(VoiceMessage.call_id == call_id).order_by(VoiceMessage.sequence)
        )).all()
    )
    recordings = list(
        (await db.scalars(
            select(VoiceRecording).where(VoiceRecording.call_id == call_id)
        )).all()
    )
    detail = VoiceCallDetail.model_validate(call)
    detail.messages = [r for r in messages]  # type: ignore[assignment]
    detail.recordings = [r for r in recordings]  # type: ignore[assignment]
    return detail


# ════════════════════════ human handoff (Phase 5) ════════════════════════

@router.post(
    "/api/voice/calls/{call_id}/transfer",
    response_model=CallTransferRead,
    status_code=201,
)
async def transfer_call(
    call_id: uuid.UUID,
    payload: TransferRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Hand a live call off to a human (warm or cold transfer).

    Creates a :class:`CallTransfer` record, asks the telephony provider to
    redirect the leg, and flips the call to ``transferred``. The AI context
    summary travels with the transfer so the human has full background.
    """
    call = await db.scalar(
        select(VoiceCall)
        .where(VoiceCall.id == call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found.")
    if call.status in CallStatus.TERMINAL:
        raise HTTPException(status_code=409, detail="Call has already ended.")

    now = datetime.now(timezone.utc)
    transfer = CallTransfer(
        organization_id=ctx.organization_id,
        call_id=call.id,
        transfer_type=payload.transfer_type,
        reason=payload.reason,
        department=payload.department,
        queue=payload.queue,
        target_number=payload.target_number,
        status=TransferStatus.requested,
        requested_at=now,
        context_summary=payload.context_summary or call.summary,
    )
    db.add(transfer)

    # Ask the provider to redirect the live leg when we have a target number.
    provider_ok = True
    if payload.target_number and call.provider_call_sid:
        provider = get_provider(call.provider)
        try:
            await provider.transfer_call(call.provider_call_sid, to_number=payload.target_number)
            transfer.status = TransferStatus.ringing
        except Exception as e:  # noqa: BLE001 — record the failure, don't 500
            provider_ok = False
            transfer.status = TransferStatus.failed
            transfer.meta = {"error": str(e)[:300]}

    if provider_ok:
        call.status = CallStatus.transferred
        call.resolution = call.resolution or "human_transfer"

    await record_event(
        db, organization_id=ctx.organization_id, event_type=VoiceEvent.transfer,
        call_id=call.id, user_id=ctx.user_id,
        metadata={
            "transfer_type": payload.transfer_type,
            "department": payload.department,
            "queue": payload.queue,
            "target": payload.target_number,
            "status": transfer.status,
        },
    )
    await db.commit()
    await db.refresh(transfer)

    # Reflect the handoff on the live session if one is active.
    mgr = get_session_manager()
    session = await mgr.get_by_call(str(call.id)) if hasattr(mgr, "get_by_call") else None
    if session is not None:
        session.meta["transferred"] = True
        await mgr.set_state(session, CallState.transferring)

    audit(
        "transfer", resource="voice_call", resource_id=str(call.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return transfer


@router.get("/api/voice/calls/{call_id}/transfers", response_model=list[CallTransferRead])
async def list_transfers(
    call_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    call = await db.scalar(
        select(VoiceCall)
        .where(VoiceCall.id == call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found.")
    rows = await db.scalars(
        select(CallTransfer)
        .where(CallTransfer.call_id == call_id)
        .order_by(CallTransfer.created_at)
    )
    return list(rows.all())


@router.post("/api/voice/calls/{call_id}/resume", response_model=VoiceCallRead)
async def resume_ai(
    call_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Return control of a transferred call to the AI (human stepped away)."""
    call = await db.scalar(
        select(VoiceCall)
        .where(VoiceCall.id == call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found.")
    if call.status == CallStatus.transferred:
        call.status = CallStatus.in_progress
    # Mark the latest open transfer as completed.
    last = await db.scalar(
        select(CallTransfer)
        .where(CallTransfer.call_id == call_id)
        .where(CallTransfer.ended_at.is_(None))
        .order_by(desc(CallTransfer.created_at))
    )
    if last is not None:
        last.status = TransferStatus.completed
        last.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(call)
    return call


# ════════════════════════ outbound ════════════════════════

@router.post("/api/voice/outgoing", response_model=CallActionResponse, status_code=201)
async def place_outbound_call(
    payload: OutboundCallRequest,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    agent = await _agent_for_org(db, payload.agent_id, ctx.organization_id)
    cfg = get_voice_config()
    channel = await _voice_channel(db, agent.id)
    provider_name = (channel.provider if channel and channel.provider else cfg.default_provider)
    from_number = payload.from_number or (channel.phone_number if channel else None) or cfg.twilio_phone_number

    call = VoiceCall(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=agent.id,
        provider=provider_name,
        direction=CallDirection.outbound,
        status=CallStatus.queued,
        caller_number=from_number,
        receiver_number=payload.to_number,
        started_at=datetime.now(timezone.utc),
        meta=payload.metadata or {},
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    mgr = get_session_manager()
    session = await mgr.create(
        call_id=str(call.id), agent_id=str(agent.id),
        organization_id=str(ctx.organization_id), project_id=str(pctx.project_id),
        provider=provider_name, direction=CallDirection.outbound,
        caller_number=from_number, receiver_number=payload.to_number,
        state=CallState.initializing,
    )

    # ── Shared cross-channel memory ──────────────────────────────────────────
    # Recognise the person we're calling by their number so the agent can pick
    # up where an earlier chat/call left off ("you wanted premium insurance…").
    try:
        meta = payload.metadata or {}
        profile = await visitor_service.upsert_profile(
            db,
            organization_id=ctx.organization_id,
            visitor_key=visitor_service.normalize_phone(payload.to_number)
            or f"call_{call.id}",
            channel="voice",
            phone=payload.to_number,
            name=meta.get("name"),
            email=meta.get("email"),
        )
        digest = visitor_service.build_memory_digest(profile, current_channel="voice")
        session.meta["visitor_profile_id"] = str(profile.id)
        if digest:
            session.meta["memory_digest"] = digest
        await db.commit()
        await mgr.save(session)
    except Exception as exc:  # noqa: BLE001 — memory must never block a call
        log.warning("outbound voice memory resolve failed: %s", exc)
        await db.rollback()

    provider = get_provider(provider_name)
    stream_url = cfg.public_wss_url(f"/api/voice/stream?session_id={session.id}&call_id={call.id}")

    # Opening line spoken to the callee the moment they answer. Prefer the
    # receptionist's configured persona; fall back to a friendly default.
    receptionist = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent.id)
    )
    business = (getattr(receptionist, "business_name", None) or agent.name or "").strip()
    greeting = (
        f"Hi, thanks for taking my call{f' from {business}' if business else ''}. "
        "How are you doing today?"
    )

    message = None
    try:
        handle = await provider.start_call(
            to_number=payload.to_number, from_number=from_number, stream_url=stream_url,
            greeting=greeting,
            parameters={"session_id": str(session.id), "call_id": str(call.id)},
        )
        call.provider_call_sid = handle.call_sid
        call.status = CallStatus.ringing if not isinstance(provider, StubVoiceProvider) else CallStatus.queued
        session.provider_call_sid = handle.call_sid
        await mgr.save(session)
        if isinstance(provider, StubVoiceProvider):
            message = "Telephony provider not configured — call queued in stub mode."
    except Exception as e:  # noqa: BLE001
        call.status = CallStatus.failed
        call.error = str(e)[:1000]
        message = f"Failed to place call: {e}"
    await record_event(
        db, organization_id=ctx.organization_id, event_type=VoiceEvent.call_started,
        call_id=call.id, user_id=ctx.user_id, metadata={"direction": "outbound"},
    )
    await db.commit()
    await db.refresh(call)
    audit(
        "create", resource="voice_call", resource_id=str(call.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return CallActionResponse(
        call_id=call.id, status=call.status, provider=provider_name,
        provider_call_sid=call.provider_call_sid, message=message,
    )


# ════════════════════════ sessions ════════════════════════

@router.get("/api/voice/sessions", response_model=list[VoiceSessionRead])
async def list_sessions(ctx: OrgContext = Depends(get_current_organization)):
    mgr = get_session_manager()
    sessions = await mgr.list_active()
    out = []
    for s in sessions:
        if s.organization_id and str(ctx.organization_id) != s.organization_id:
            continue
        out.append(VoiceSessionRead(
            id=s.id, call_id=s.call_id, agent_id=s.agent_id, state=s.state,
            direction=s.direction, caller_number=s.caller_number, language=s.language,
            duration_seconds=s.duration_seconds, avg_latency_ms=s.avg_latency_ms,
            tokens=s.tokens, turns=len(s.turns),
        ))
    return out


@router.delete("/api/voice/session/{session_id}", status_code=204)
async def end_session(
    session_id: str,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    mgr = get_session_manager()
    session = await mgr.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.organization_id and str(ctx.organization_id) != session.organization_id:
        raise HTTPException(status_code=403, detail="Not your session.")
    # Best-effort hangup at the provider.
    if session.provider_call_sid:
        try:
            await get_provider(session.provider).end_call(session.provider_call_sid)
        except Exception:  # noqa: BLE001
            pass
    await mgr.set_state(session, CallState.ended)
    await mgr.delete(session_id)
    try:
        call = await db.scalar(select(VoiceCall).where(VoiceCall.id == uuid.UUID(session.call_id)))
        if call and call.status not in CallStatus.TERMINAL:
            call.status = CallStatus.completed
            call.ended_at = datetime.now(timezone.utc)
            await db.commit()
    except Exception:  # noqa: BLE001
        pass
    return Response(status_code=204)


# ════════════════════════ dashboard ════════════════════════

@router.get("/api/voice/dashboard", response_model=VoiceDashboard)
async def dashboard(
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    org_id, proj_id = pctx.organization_id, pctx.project_id
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    scope = (VoiceCall.organization_id == org_id) & (VoiceCall.project_id == proj_id)

    calls_today = await db.scalar(
        select(func.count()).select_from(VoiceCall).where(scope, VoiceCall.created_at >= since)
    ) or 0
    completed = await db.scalar(
        select(func.count()).select_from(VoiceCall).where(scope, VoiceCall.status == CallStatus.completed)
    ) or 0
    failed = await db.scalar(
        select(func.count()).select_from(VoiceCall).where(
            scope, VoiceCall.status.in_([CallStatus.failed, CallStatus.no_answer, CallStatus.busy])
        )
    ) or 0
    total_calls = await db.scalar(select(func.count()).select_from(VoiceCall).where(scope)) or 0
    avg_duration = await db.scalar(
        select(func.coalesce(func.avg(VoiceCall.duration_seconds), 0.0)).where(scope)
    ) or 0.0
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(VoiceCall.cost), 0.0)).where(scope)
    ) or 0.0
    avg_latency = await db.scalar(
        select(func.coalesce(func.avg(VoiceCall.avg_latency_ms), 0.0)).where(
            scope, VoiceCall.avg_latency_ms > 0
        )
    ) or 0.0
    resolved = await db.scalar(
        select(func.count()).select_from(VoiceCall).where(scope, VoiceCall.resolution == "ai_resolved")
    ) or 0
    transferred = await db.scalar(
        select(func.count()).select_from(VoiceCall).where(
            scope, VoiceCall.status == CallStatus.transferred
        )
    ) or 0

    mgr = get_session_manager()
    live = len([s for s in await mgr.list_active()
                if not s.organization_id or s.organization_id == str(org_id)])

    recent = list(
        (await db.scalars(
            select(VoiceCall).where(scope).order_by(desc(VoiceCall.created_at)).limit(10)
        )).all()
    )
    denom = total_calls or 1
    return VoiceDashboard(
        calls_today=calls_today, live_calls=live, completed=completed, failed=failed,
        avg_duration_seconds=round(float(avg_duration), 1),
        total_cost=round(float(total_cost), 4),
        avg_latency_ms=round(float(avg_latency), 1),
        ai_resolution_rate=round(resolved / denom, 4),
        human_transfer_rate=round(transferred / denom, 4),
        recent_calls=[VoiceCallRead.model_validate(r) for r in recent],
    )


# ════════════════════════ provider webhooks ════════════════════════

@router.post("/api/voice/incoming")
async def incoming_call(request: Request, db: AsyncSession = Depends(get_db)):
    """Twilio inbound webhook. Identifies the agent by the dialed number,
    creates a call + session, and returns TwiML that opens a media stream."""
    form = dict((await request.form()).items())
    to_number = form.get("To") or form.get("Called") or ""
    from_number = form.get("From") or form.get("Caller") or ""
    call_sid = form.get("CallSid") or ""
    cfg = get_voice_config()

    # Resolve the agent that owns this number via its voice channel.
    channel = await db.scalar(
        select(AgentChannel)
        .where(AgentChannel.channel == ChannelType.voice)
        .where(AgentChannel.phone_number == to_number)
        .where(AgentChannel.enabled.is_(True))
    )
    if channel is None:
        # No agent bound to this number — polite rejection.
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?><Response>'
            "<Say>Sorry, this number is not currently in service.</Say><Hangup/></Response>"
        )
        return Response(content=twiml, media_type="application/xml")

    provider = get_provider(channel.provider or cfg.default_provider)
    # Verify signature when configured (skip for stub).
    if not isinstance(provider, StubVoiceProvider):
        signature = request.headers.get("X-Twilio-Signature", "")
        url = cfg.public_https_url("/api/voice/incoming")
        if signature and not provider.verify_webhook(url=url, params=form, signature=signature):
            raise HTTPException(status_code=403, detail="Invalid signature.")

    call = VoiceCall(
        organization_id=channel.organization_id,
        project_id=channel.project_id,
        agent_id=channel.agent_id,
        provider=channel.provider or cfg.default_provider,
        provider_call_sid=call_sid,
        direction=CallDirection.inbound,
        status=CallStatus.in_progress,
        caller_number=from_number,
        receiver_number=to_number,
        started_at=datetime.now(timezone.utc),
        answered_at=datetime.now(timezone.utc),
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    mgr = get_session_manager()
    session = await mgr.create(
        call_id=str(call.id), agent_id=str(channel.agent_id),
        organization_id=str(channel.organization_id),
        project_id=str(channel.project_id) if channel.project_id else None,
        provider=call.provider, provider_call_sid=call_sid,
        direction=CallDirection.inbound, caller_number=from_number,
        receiver_number=to_number, state=CallState.greeting,
    )
    await record_event(
        db, organization_id=channel.organization_id, event_type=VoiceEvent.call_started,
        call_id=call.id, metadata={"direction": "inbound", "from": from_number},
        commit=True,
    )

    # Greeting: context-aware via the Phase 2 greeting engine (business hours,
    # holidays, time of day, language) when a receptionist profile exists.
    receptionist = await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == channel.agent_id)
    )
    greeting = None
    after_hours = False
    if receptionist is not None:
        hours = evaluate_hours(
            receptionist.business_hours or {}, receptionist.holidays or [],
            receptionist.timezone or "UTC",
        )
        greeting, after_hours = greeting_engine.build(receptionist, hours=hours)
        session.meta["after_hours"] = after_hours
        session.meta["business_open"] = hours.is_open
        session.meta["timezone"] = receptionist.timezone or "UTC"
        await mgr.save(session)

    # ── Shared cross-channel memory ──────────────────────────────────────────
    # Resolve (or create) the ONE visitor identity for this caller by phone, so
    # the agent already knows them if they chatted/called before. The compact
    # memory digest is stashed on the session and injected into the system
    # prompt by the agent bridge — no per-turn DB round-trip.
    try:
        profile = await visitor_service.upsert_profile(
            db,
            organization_id=channel.organization_id,
            visitor_key=visitor_service.normalize_phone(from_number)
            or f"call_{call.id}",
            channel="voice",
            phone=from_number,
        )
        digest = visitor_service.build_memory_digest(profile, current_channel="voice")
        session.meta["visitor_profile_id"] = str(profile.id)
        if digest:
            session.meta["memory_digest"] = digest
        await db.commit()
        await mgr.save(session)
    except Exception as exc:  # noqa: BLE001 — memory must never break a call
        log.warning("voice memory resolve failed: %s", exc)
        await db.rollback()

    stream_url = cfg.public_wss_url(
        f"/api/voice/stream?session_id={session.id}&call_id={call.id}"
    )
    twiml = provider.build_answer_response(
        stream_url=stream_url, greeting=greeting,
        parameters={"session_id": str(session.id), "call_id": str(call.id)},
    )
    return Response(content=twiml, media_type=provider.media_response_content_type())


@router.post("/api/voice/status")
async def call_status(request: Request, db: AsyncSession = Depends(get_db)):
    """Twilio status callback — updates the call row terminal state."""
    form = dict((await request.form()).items())
    call_sid = form.get("CallSid") or ""
    twilio_status = (form.get("CallStatus") or "").lower()
    duration = form.get("CallDuration")
    if not call_sid:
        return {"ok": True}
    call = await db.scalar(select(VoiceCall).where(VoiceCall.provider_call_sid == call_sid))
    if call is None:
        return {"ok": True}
    mapping = {
        "completed": CallStatus.completed, "busy": CallStatus.busy,
        "no-answer": CallStatus.no_answer, "failed": CallStatus.failed,
        "canceled": CallStatus.canceled, "in-progress": CallStatus.in_progress,
        "ringing": CallStatus.ringing,
    }
    new_status = mapping.get(twilio_status)
    if new_status:
        call.status = new_status
    if duration:
        try:
            call.duration_seconds = int(duration)
        except ValueError:
            pass
    if new_status in CallStatus.TERMINAL:
        call.ended_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


# ════════════════════════ media stream WebSocket ════════════════════════

@router.websocket("/api/voice/stream")
async def voice_stream(websocket: WebSocket):
    """Twilio Media Streams endpoint. Auth is via the provider opening the
    socket with our generated URL (carrying session_id/call_id params); the
    media protocol itself is the trust boundary."""
    await websocket.accept()
    handler = MediaStreamHandler(
        websocket,
        session_id=websocket.query_params.get("session_id"),
        call_id=websocket.query_params.get("call_id"),
    )
    await handler.run()
