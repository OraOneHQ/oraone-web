"""Enterprise Voice API (Phase 9).

Bundles the enterprise-tier control plane:

* **9.1 Languages**   — GET ``/api/voice/languages`` supported-language registry.
* **9.4 Translation** — POST ``/api/voice/translate`` (live / transcript / summary).
* **9.2 Voice styles**— GET ``/api/voice/voice-styles`` built-in presets.
* **9.3 Voice library**— CRUD + ``approve`` / ``revoke`` governance for branded
                          and cloned voices.
* **9.5 Recordings**  — list / read / update metadata (consent, tags, retention).
* **9.6 Supervisor**  — live console + intervention engine (listen / whisper /
                          barge / takeover / force_transfer / end_call).
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    VoiceCall,
    VoiceLibraryEntry,
    VoiceLibraryStatus,
    VoiceRecording,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    ActiveCallRead,
    RecordingListResponse,
    RecordingRead,
    RecordingUpdate,
    SuperviseRequest,
    SuperviseResponse,
    SupervisorConsoleResponse,
    TranslateRequest,
    TranslateResponse,
    VoiceLibraryCreate,
    VoiceLibraryListResponse,
    VoiceLibraryRead,
    VoiceLibraryUpdate,
)
from app.services.audit import audit
from app.services.voice.analytics import VoiceEvent, record_event
from app.services.voice.enterprise import (
    LANGUAGES,
    VOICE_STYLE_PROFILES,
    normalize_language,
    translation_engine,
)
from app.services.voice.session import CallState, get_session_manager

router = APIRouter(tags=["voice-enterprise"])

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    return _SLUG_RE.sub("-", value.strip().lower()).strip("-") or "voice"


# ─────────────────────────────── 9.1 languages ───────────────────────────────

@router.get("/api/voice/languages")
async def list_languages(
    ctx: OrgContext = Depends(get_current_organization),
):
    return {
        "items": [
            {
                "code": lang.code,
                "name": lang.name,
                "native": lang.native,
                "rtl": lang.rtl,
                "greeting": lang.greeting,
            }
            for lang in LANGUAGES.values()
        ],
        "total": len(LANGUAGES),
    }


# ─────────────────────────────── 9.2 voice styles ────────────────────────────

@router.get("/api/voice/voice-styles")
async def list_voice_styles(
    ctx: OrgContext = Depends(get_current_organization),
):
    return {
        "items": [{"profile": name, **settings} for name, settings in VOICE_STYLE_PROFILES.items()],
        "total": len(VOICE_STYLE_PROFILES),
    }


# ─────────────────────────────── 9.4 translation ─────────────────────────────

@router.post("/api/voice/translate", response_model=TranslateResponse)
async def translate(
    payload: TranslateRequest,
    ctx: OrgContext = Depends(get_current_organization),
):
    if normalize_language(payload.target_language) not in LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported target language.")
    result = await translation_engine.translate(
        payload.text,
        payload.target_language,
        source_language=payload.source_language,
        formality=payload.formality,
    )
    return TranslateResponse(
        text=result.text,
        source_language=result.source_language,
        target_language=result.target_language,
        translated=result.translated,
        provider=result.provider,
        confidence=result.confidence,
    )


# ─────────────────────────────── 9.3 voice library ───────────────────────────

async def _library_entry(db: AsyncSession, entry_id: uuid.UUID, org_id: uuid.UUID) -> VoiceLibraryEntry:
    entry = await db.scalar(
        select(VoiceLibraryEntry)
        .where(VoiceLibraryEntry.id == entry_id)
        .where(VoiceLibraryEntry.organization_id == org_id)
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Voice not found.")
    return entry


@router.get("/api/voice/voice-library", response_model=VoiceLibraryListResponse)
async def list_voice_library(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    kind: Optional[str] = Query(default=None),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VoiceLibraryEntry).where(VoiceLibraryEntry.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(VoiceLibraryEntry.status == status_filter)
    if kind:
        stmt = stmt.where(VoiceLibraryEntry.kind == kind)
    stmt = stmt.order_by(desc(VoiceLibraryEntry.created_at))
    rows = (await db.scalars(stmt)).all()
    return VoiceLibraryListResponse(
        items=[VoiceLibraryRead.model_validate(r) for r in rows], total=len(rows)
    )


@router.post("/api/voice/voice-library", response_model=VoiceLibraryRead, status_code=status.HTTP_201_CREATED)
async def create_voice_library(
    payload: VoiceLibraryCreate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    slug = _slugify(payload.slug or payload.name)
    exists = await db.scalar(
        select(VoiceLibraryEntry.id)
        .where(VoiceLibraryEntry.organization_id == ctx.organization_id)
        .where(VoiceLibraryEntry.slug == slug)
    )
    if exists:
        raise HTTPException(status_code=409, detail="A voice with this slug already exists.")
    entry = VoiceLibraryEntry(
        organization_id=ctx.organization_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        provider=payload.provider,
        provider_voice_id=payload.provider_voice_id,
        kind=payload.kind,
        language=normalize_language(payload.language),
        gender=payload.gender,
        accent=payload.accent,
        style_profile=payload.style_profile,
        consent_obtained=payload.consent_obtained,
        status=VoiceLibraryStatus.pending,
        meta=payload.metadata or {},
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    audit(
        "create", resource="voice_library", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return VoiceLibraryRead.model_validate(entry)


@router.get("/api/voice/voice-library/{entry_id}", response_model=VoiceLibraryRead)
async def get_voice_library(
    entry_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    return VoiceLibraryRead.model_validate(await _library_entry(db, entry_id, ctx.organization_id))


@router.patch("/api/voice/voice-library/{entry_id}", response_model=VoiceLibraryRead)
async def update_voice_library(
    entry_id: uuid.UUID,
    payload: VoiceLibraryUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    entry = await _library_entry(db, entry_id, ctx.organization_id)
    data = payload.model_dump(exclude_unset=True)
    if "metadata" in data:
        entry.meta = {**(entry.meta or {}), **(data.pop("metadata") or {})}
    if "language" in data and data["language"]:
        data["language"] = normalize_language(data["language"])
    for key, value in data.items():
        setattr(entry, key, value)
    # Editing an approved voice creates a new version pending re-approval.
    if entry.status == VoiceLibraryStatus.approved and data:
        entry.version += 1
        entry.status = VoiceLibraryStatus.pending
        entry.approved_at = None
        entry.approved_by = None
    await db.commit()
    await db.refresh(entry)
    audit(
        "update", resource="voice_library", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return VoiceLibraryRead.model_validate(entry)


@router.post("/api/voice/voice-library/{entry_id}/approve", response_model=VoiceLibraryRead)
async def approve_voice_library(
    entry_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    entry = await _library_entry(db, entry_id, ctx.organization_id)
    if entry.kind == "cloned" and not entry.consent_obtained:
        raise HTTPException(status_code=400, detail="Consent is required before approving a cloned voice.")
    entry.status = VoiceLibraryStatus.approved
    entry.approved_by = ctx.user_id
    entry.approved_at = datetime.now(timezone.utc)
    entry.revoked_at = None
    await db.commit()
    await db.refresh(entry)
    audit(
        "approve", resource="voice_library", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return VoiceLibraryRead.model_validate(entry)


@router.post("/api/voice/voice-library/{entry_id}/revoke", response_model=VoiceLibraryRead)
async def revoke_voice_library(
    entry_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    entry = await _library_entry(db, entry_id, ctx.organization_id)
    entry.status = VoiceLibraryStatus.revoked
    entry.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    audit(
        "revoke", resource="voice_library", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return VoiceLibraryRead.model_validate(entry)


@router.delete("/api/voice/voice-library/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice_library(
    entry_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    entry = await _library_entry(db, entry_id, ctx.organization_id)
    await db.delete(entry)
    await db.commit()
    audit(
        "delete", resource="voice_library", resource_id=str(entry_id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )


# ─────────────────────────────── 9.5 recordings ──────────────────────────────

async def _recording(db: AsyncSession, recording_id: uuid.UUID, org_id: uuid.UUID) -> VoiceRecording:
    rec = await db.scalar(
        select(VoiceRecording)
        .join(VoiceCall, VoiceCall.id == VoiceRecording.call_id)
        .where(VoiceRecording.id == recording_id)
        .where(VoiceCall.organization_id == org_id)
    )
    if rec is None:
        raise HTTPException(status_code=404, detail="Recording not found.")
    return rec


@router.get("/api/voice/recordings", response_model=RecordingListResponse)
async def list_recordings(
    call_id: Optional[uuid.UUID] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(VoiceRecording)
        .join(VoiceCall, VoiceCall.id == VoiceRecording.call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call_id:
        stmt = stmt.where(VoiceRecording.call_id == call_id)
    if kind:
        stmt = stmt.where(VoiceRecording.kind == kind)
    stmt = stmt.order_by(desc(VoiceRecording.created_at)).limit(limit)
    rows = (await db.scalars(stmt)).all()
    return RecordingListResponse(
        items=[RecordingRead.model_validate(r) for r in rows], total=len(rows)
    )


@router.get("/api/voice/recordings/{recording_id}", response_model=RecordingRead)
async def get_recording(
    recording_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    return RecordingRead.model_validate(await _recording(db, recording_id, ctx.organization_id))


@router.patch("/api/voice/recordings/{recording_id}", response_model=RecordingRead)
async def update_recording(
    recording_id: uuid.UUID,
    payload: RecordingUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    rec = await _recording(db, recording_id, ctx.organization_id)
    data = payload.model_dump(exclude_unset=True)
    meta = dict(rec.meta or {})
    if "consent" in data:
        meta["consent"] = data["consent"]
    if "tags" in data:
        meta["tags"] = data["tags"]
    if "retention_days" in data:
        meta["retention_days"] = data["retention_days"]
    if "redacted" in data:
        meta["redacted"] = data["redacted"]
    if "notes" in data:
        meta["notes"] = data["notes"]
    rec.meta = meta
    await db.commit()
    await db.refresh(rec)
    audit(
        "update", resource="voice_recording", resource_id=str(rec.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return RecordingRead.model_validate(rec)


# ─────────────────────────────── 9.6 supervisor ──────────────────────────────

def _session_to_active(session) -> ActiveCallRead:
    meta = session.meta or {}
    return ActiveCallRead(
        session_id=session.id,
        call_id=session.call_id,
        agent_id=session.agent_id,
        state=session.state,
        direction=session.direction,
        language=session.language,
        caller_number=session.caller_number,
        duration_seconds=session.duration_seconds,
        supervised=bool(meta.get("supervisor")),
        intent=meta.get("intent"),
    )


@router.get("/api/voice/supervisor/console", response_model=SupervisorConsoleResponse)
async def supervisor_console(
    ctx: OrgContext = Depends(get_current_organization),
):
    mgr = get_session_manager()
    sessions = [s for s in await mgr.list_active() if str(s.organization_id) == str(ctx.organization_id)]
    active = [_session_to_active(s) for s in sessions]
    human = sum(1 for s in sessions if (s.meta or {}).get("human_active"))
    return SupervisorConsoleResponse(
        active_calls=active,
        total_active=len(active),
        ai_calls=len(active) - human,
        human_calls=human,
        supervised=sum(1 for a in active if a.supervised),
    )


@router.post("/api/voice/calls/{call_id}/supervise", response_model=SuperviseResponse)
async def supervise_call(
    call_id: uuid.UUID,
    payload: SuperviseRequest,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    call = await db.scalar(
        select(VoiceCall)
        .where(VoiceCall.id == call_id)
        .where(VoiceCall.organization_id == ctx.organization_id)
    )
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found.")

    mgr = get_session_manager()
    # Locate the live session for this call (sessions are keyed by session id).
    session = None
    for s in await mgr.list_active():
        if str(s.call_id) == str(call_id):
            session = s
            break

    applied = False
    detail: Optional[str] = None
    new_state: Optional[str] = None

    if session is None:
        detail = "No live session for this call; intervention recorded for audit only."
    else:
        sup = dict(session.meta.get("supervisor") or {})
        sup["user_id"] = str(ctx.user_id)
        sup["action"] = payload.action
        sup["at"] = datetime.now(timezone.utc).isoformat()
        if payload.action == "listen" or payload.action == "monitor":
            sup["mode"] = "listen"
        elif payload.action == "whisper":
            sup["mode"] = "whisper"
            sup["message"] = payload.message
            session.log_event("supervisor_whisper", message=payload.message)
        elif payload.action == "barge":
            sup["mode"] = "barge"
            sup["message"] = payload.message
            session.log_event("supervisor_barge", message=payload.message)
        elif payload.action == "takeover":
            sup["mode"] = "takeover"
            session.meta["human_active"] = True
            await mgr.set_state(session, CallState.transferring)
            new_state = CallState.transferring
        elif payload.action == "force_transfer":
            sup["mode"] = "force_transfer"
            sup["target"] = payload.target
            await mgr.set_state(session, CallState.transferring)
            new_state = CallState.transferring
        elif payload.action == "end_call":
            sup["mode"] = "end_call"
            await mgr.set_state(session, CallState.ended)
            new_state = CallState.ended
        session.meta["supervisor"] = sup
        await mgr.save(session)
        applied = True
        new_state = new_state or session.state

    await record_event(
        db, organization_id=ctx.organization_id, event_type=VoiceEvent.supervision,
        call_id=call_id, user_id=ctx.user_id,
        metadata={
            "action": payload.action, "message": payload.message,
            "target": payload.target, "note": payload.note, "applied": applied,
        },
        commit=True,
    )
    audit(
        f"supervise.{payload.action}", resource="voice_call", resource_id=str(call_id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return SuperviseResponse(
        call_id=call_id, action=payload.action, applied=applied, state=new_state, detail=detail,
    )
