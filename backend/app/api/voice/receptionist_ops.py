"""AI Receptionist operations API (Phase 2).

Booking, voicemail, callback and consent endpoints that back the receptionist
call flows and the 60 Phase-2 test cases:

* Appointments (TC-009/010/019..022) — check / book / list / cancel.
* Voicemail (TC-030..032)            — capture with empty-detection.
* Callback (TC-060)                  — request + fire callback workflow.
* Consent (TC-045)                   — recording-consent notice text.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import (
    AppointmentStatus,
    CallbackStatus,
    ReceptionistProfile,
    VoiceAppointment,
    VoiceCallback,
    VoiceCall,
    VoiceRecording,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    AppointmentCheckRequest,
    AppointmentCheckResponse,
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentRead,
    CallbackCreate,
    CallbackListResponse,
    CallbackRead,
    ConsentNoticeResponse,
    VoicemailCapture,
    VoicemailCaptureResponse,
)
from app.services.audit import audit
from app.services.voice.appointments import appointment_engine, voicemail_service
from app.services.voice.enterprise import normalize_language
from app.services.voice.workflow_triggers import evaluate_and_fire

router = APIRouter(tags=["voice-receptionist-ops"])


# ───────────────────────────────── helpers ───────────────────────────────────

async def _agent(db: AsyncSession, agent_id: uuid.UUID, org_id: uuid.UUID) -> Agent:
    agent = await db.scalar(
        select(Agent).where(Agent.id == agent_id).where(Agent.organization_id == org_id)
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return agent


async def _receptionist(db: AsyncSession, agent_id: uuid.UUID) -> Optional[ReceptionistProfile]:
    return await db.scalar(
        select(ReceptionistProfile).where(ReceptionistProfile.agent_id == agent_id)
    )


async def _booked_after(db: AsyncSession, agent_id: uuid.UUID, since: datetime) -> list[datetime]:
    rows = await db.scalars(
        select(VoiceAppointment.scheduled_at)
        .where(VoiceAppointment.agent_id == agent_id)
        .where(VoiceAppointment.status.in_([AppointmentStatus.booked, AppointmentStatus.rescheduled]))
        .where(VoiceAppointment.scheduled_at >= since)
    )
    return list(rows)


# ──────────────────────────────── appointments ───────────────────────────────

@router.post("/api/voice/appointments/check", response_model=AppointmentCheckResponse)
async def check_appointment(
    payload: AppointmentCheckRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, payload.agent_id, ctx.organization_id)
    profile = await _receptionist(db, payload.agent_id)
    settings = (profile.appointment_settings if profile else {}) or {}
    tz = (profile.timezone if profile else "UTC") or "UTC"
    booked = await _booked_after(db, payload.agent_id, datetime.now(timezone.utc))
    decision = appointment_engine.validate_and_check(
        payload.requested_at, settings=settings, booked=booked, timezone=tz, suggest=payload.suggest
    )
    return AppointmentCheckResponse(
        ok=decision.ok, code=decision.code, reason=decision.reason,
        normalized_at=decision.normalized_at, alternatives=decision.alternatives,
    )


@router.post("/api/voice/appointments", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    await _agent(db, payload.agent_id, ctx.organization_id)
    profile = await _receptionist(db, payload.agent_id)
    settings = (profile.appointment_settings if profile else {}) or {}
    tz = (profile.timezone if profile else "UTC") or "UTC"
    booked = await _booked_after(db, payload.agent_id, datetime.now(timezone.utc))
    decision = appointment_engine.validate_and_check(
        payload.requested_at, settings=settings, booked=booked, timezone=tz
    )
    if not decision.ok and not payload.force:
        raise HTTPException(
            status_code=409,
            detail={"reason": decision.reason, "code": decision.code, "alternatives": decision.alternatives},
        )
    scheduled = decision.normalized_at
    if scheduled is None:  # force=True with an unparseable time
        from app.services.voice.appointments import _coerce_dt
        from app.services.voice.receptionist import _safe_zone
        scheduled = _coerce_dt(payload.requested_at, _safe_zone(tz))
        if scheduled is None:
            raise HTTPException(status_code=422, detail="Could not parse requested_at.")

    appt = VoiceAppointment(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        call_id=payload.call_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        service=payload.service,
        scheduled_at=scheduled,
        duration_minutes=payload.duration_minutes,
        timezone=tz,
        status=AppointmentStatus.booked,
        notes=payload.notes,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    audit(
        "create", resource="voice_appointment", resource_id=str(appt.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return AppointmentRead.model_validate(appt)


@router.get("/api/voice/appointments", response_model=AppointmentListResponse)
async def list_appointments(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(VoiceAppointment)
        .where(VoiceAppointment.organization_id == pctx.organization_id)
        .where(VoiceAppointment.project_id == pctx.project_id)
    )
    if agent_id:
        stmt = stmt.where(VoiceAppointment.agent_id == agent_id)
    if status_filter:
        stmt = stmt.where(VoiceAppointment.status == status_filter)
    stmt = stmt.order_by(desc(VoiceAppointment.scheduled_at)).limit(limit)
    rows = (await db.scalars(stmt)).all()
    return AppointmentListResponse(
        items=[AppointmentRead.model_validate(r) for r in rows], total=len(rows)
    )


@router.post("/api/voice/appointments/{appointment_id}/cancel", response_model=AppointmentRead)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    appt = await db.scalar(
        select(VoiceAppointment)
        .where(VoiceAppointment.id == appointment_id)
        .where(VoiceAppointment.organization_id == ctx.organization_id)
    )
    if appt is None:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    appt.status = AppointmentStatus.canceled
    appt.canceled_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(appt)
    audit(
        "cancel", resource="voice_appointment", resource_id=str(appt.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return AppointmentRead.model_validate(appt)


# ───────────────────────────────── voicemail ─────────────────────────────────

@router.post("/api/voice/calls/{call_id}/voicemail", response_model=VoicemailCaptureResponse)
async def capture_voicemail(
    call_id: uuid.UUID,
    payload: VoicemailCapture,
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

    decision = voicemail_service.evaluate(
        transcript=payload.transcript, duration_seconds=payload.duration_seconds
    )
    if not decision.keep:
        # TC-031: empty voicemail is ignored — nothing stored.
        return VoicemailCaptureResponse(kept=False, reason=decision.reason, duration_seconds=decision.duration_seconds)

    rec = VoiceRecording(
        call_id=call_id,
        provider="twilio",
        kind="voicemail",
        url=payload.url,
        storage_key=payload.storage_key,
        duration_seconds=decision.duration_seconds,
        transcript=decision.transcript,
        meta={"source": "voicemail"},
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    audit(
        "create", resource="voice_voicemail", resource_id=str(rec.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return VoicemailCaptureResponse(
        kept=True, reason=decision.reason, recording_id=rec.id, duration_seconds=decision.duration_seconds
    )


# ───────────────────────────────── callbacks ─────────────────────────────────

@router.post("/api/voice/callbacks", response_model=CallbackRead, status_code=status.HTTP_201_CREATED)
async def create_callback(
    payload: CallbackCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    preferred = None
    if payload.preferred_time:
        from app.services.voice.appointments import _coerce_dt
        from app.services.voice.receptionist import _safe_zone
        preferred = _coerce_dt(payload.preferred_time, _safe_zone("UTC"))

    cb = VoiceCallback(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        call_id=payload.call_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        reason=payload.reason,
        preferred_time=preferred,
        status=CallbackStatus.pending,
    )
    db.add(cb)
    await db.commit()
    await db.refresh(cb)

    # TC-060: callback request triggers a workflow (if one is bound to the
    # "callback" intent). Best-effort — never blocks the request.
    try:
        run_ids = await evaluate_and_fire(
            db,
            organization_id=ctx.organization_id,
            agent_id=payload.agent_id,
            signal_type="intent",
            value="callback",
            text=payload.reason or "callback requested",
            context={"callback_id": str(cb.id), "call_id": str(payload.call_id) if payload.call_id else None},
        )
        if run_ids:
            cb.workflow_run_id = run_ids[0]
            cb.status = CallbackStatus.scheduled
            await db.commit()
            await db.refresh(cb)
    except Exception:  # noqa: BLE001 — workflow firing must not fail the callback
        pass

    audit(
        "create", resource="voice_callback", resource_id=str(cb.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return CallbackRead.model_validate(cb)


@router.get("/api/voice/callbacks", response_model=CallbackListResponse)
async def list_callbacks(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(VoiceCallback)
        .where(VoiceCallback.organization_id == pctx.organization_id)
        .where(VoiceCallback.project_id == pctx.project_id)
    )
    if status_filter:
        stmt = stmt.where(VoiceCallback.status == status_filter)
    stmt = stmt.order_by(desc(VoiceCallback.created_at)).limit(limit)
    rows = (await db.scalars(stmt)).all()
    return CallbackListResponse(
        items=[CallbackRead.model_validate(r) for r in rows], total=len(rows)
    )


# ─────────────────────────────── consent (TC-045) ────────────────────────────

@router.get("/api/agents/{agent_id}/receptionist/consent-notice", response_model=ConsentNoticeResponse)
async def consent_notice(
    agent_id: uuid.UUID,
    language: Optional[str] = Query(default=None),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _agent(db, agent_id, ctx.organization_id)
    profile = await _receptionist(db, agent_id)
    enabled = bool(profile.allow_recording) if profile else False
    lang = normalize_language(language or (profile.default_language if profile else "en"))
    business = (profile.business_name if profile else "") or "us"
    if enabled:
        notice = (
            f"Please note, this call may be recorded for quality and training purposes. "
            f"Thank you for calling {business}."
        )
    else:
        notice = ""
    return ConsentNoticeResponse(recording_enabled=enabled, notice=notice, language=lang)
