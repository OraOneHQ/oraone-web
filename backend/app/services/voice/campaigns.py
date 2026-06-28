"""Outbound campaign engine (Phase 8).

A campaign is an Agent + a list of phone numbers + a goal (reminder,
collection, survey, sales, notification). The runner dials contacts in
batches honouring ``concurrency`` and ``max_attempts``, reusing the same
telephony provider + media-stream machinery as a single outbound call.

Dialing happens through :func:`dispatch_contact`, which mirrors the
``/api/voice/outgoing`` endpoint but is contact-aware (records the call on the
contact, increments attempts, updates campaign counters). The batch dispatcher
is safe to call repeatedly — it is the unit a scheduler/worker would invoke.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    CallDirection,
    CallStatus,
    CampaignContactStatus,
    CampaignStatus,
    VoiceCall,
    VoiceCampaign,
    VoiceCampaignContact,
)
from app.services.voice.analytics import VoiceEvent, record_event
from app.services.voice.config import get_voice_config
from app.services.voice.providers import StubVoiceProvider, get_provider
from app.services.voice.session import CallState, get_session_manager
from app.services.voice.suppression import is_suppressed

log = logging.getLogger("app.voice.campaigns")


async def dispatch_contact(
    db: AsyncSession,
    campaign: VoiceCampaign,
    contact: VoiceCampaignContact,
) -> VoiceCall:
    """Place one outbound call for a campaign contact.

    Creates the :class:`VoiceCall`, opens a voice session, asks the provider to
    dial, and links the call back to the contact. Never raises — failures are
    recorded on the call + contact so the batch loop keeps going.
    """
    cfg = get_voice_config()
    provider_name = campaign.configuration.get("provider") or cfg.default_provider
    from_number = campaign.from_number or cfg.twilio_phone_number

    call = VoiceCall(
        organization_id=campaign.organization_id,
        project_id=campaign.project_id,
        agent_id=campaign.agent_id,
        campaign_id=campaign.id,
        provider=provider_name,
        direction=CallDirection.outbound,
        status=CallStatus.queued,
        caller_number=from_number,
        receiver_number=contact.phone_number,
        started_at=datetime.now(timezone.utc),
        meta={"campaign_id": str(campaign.id), "contact_id": str(contact.id),
              "goal": campaign.goal, "variables": contact.variables},
    )
    db.add(call)
    await db.flush()  # assign call.id without a full commit

    contact.attempts += 1
    contact.last_call_id = call.id
    contact.last_attempt_at = datetime.now(timezone.utc)
    contact.status = CampaignContactStatus.calling

    mgr = get_session_manager()
    session = await mgr.create(
        call_id=str(call.id), agent_id=str(campaign.agent_id),
        organization_id=str(campaign.organization_id),
        project_id=str(campaign.project_id) if campaign.project_id else None,
        provider=provider_name, direction=CallDirection.outbound,
        caller_number=from_number, receiver_number=contact.phone_number,
        state=CallState.initializing,
    )
    session.meta["campaign_id"] = str(campaign.id)
    session.meta["contact_variables"] = contact.variables

    provider = get_provider(provider_name)
    stream_url = cfg.public_wss_url(f"/api/voice/stream?session_id={session.id}&call_id={call.id}")
    try:
        handle = await provider.start_call(
            to_number=contact.phone_number, from_number=from_number, stream_url=stream_url,
        )
        call.provider_call_sid = handle.call_sid
        session.provider_call_sid = handle.call_sid
        call.status = (
            CallStatus.queued if isinstance(provider, StubVoiceProvider) else CallStatus.ringing
        )
        await mgr.save(session)
    except Exception as e:  # noqa: BLE001 — record + keep the batch alive
        call.status = CallStatus.failed
        call.error = str(e)[:1000]
        contact.status = CampaignContactStatus.failed
        contact.outcome = "dial_failed"
        if contact.attempts < campaign.max_attempts:
            # Leave it retryable on the next batch.
            contact.status = CampaignContactStatus.pending
        await mgr.delete(session.id)
        log.info("campaign %s contact %s dial failed: %s", campaign.id, contact.id, e)

    await record_event(
        db, organization_id=campaign.organization_id, event_type=VoiceEvent.call_started,
        call_id=call.id,
        metadata={"direction": "outbound", "campaign_id": str(campaign.id)},
    )
    return call


async def dispatch_next_batch(db: AsyncSession, campaign: VoiceCampaign) -> dict:
    """Dial up to ``concurrency`` pending contacts for a running campaign.

    Returns a small summary dict. Marks the campaign completed when no dialable
    contacts remain.
    """
    if campaign.status not in (CampaignStatus.running,):
        return {"dispatched": 0, "status": campaign.status, "reason": "campaign not running"}

    limit = max(1, campaign.concurrency)
    contacts = list(
        (await db.scalars(
            select(VoiceCampaignContact)
            .where(VoiceCampaignContact.campaign_id == campaign.id)
            .where(VoiceCampaignContact.status == CampaignContactStatus.pending)
            .where(VoiceCampaignContact.attempts < campaign.max_attempts)
            .order_by(VoiceCampaignContact.created_at)
            .limit(limit)
        )).all()
    )

    dispatched = 0
    for contact in contacts:
        # Compliance gate: never dial a suppressed (DND / opted-out) number.
        entry = await is_suppressed(db, campaign.organization_id, contact.phone_number)
        if entry is not None:
            contact.status = CampaignContactStatus.skipped
            contact.outcome = f"suppressed:{entry.reason}"
            contact.last_attempt_at = datetime.now(timezone.utc)
            continue
        await dispatch_contact(db, campaign, contact)
        dispatched += 1

    # Recompute completion state.
    remaining = await db.scalar(
        select(func.count())
        .select_from(VoiceCampaignContact)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
        .where(VoiceCampaignContact.status.in_(
            [CampaignContactStatus.pending, CampaignContactStatus.queued,
             CampaignContactStatus.calling]
        ))
        .where(VoiceCampaignContact.attempts < campaign.max_attempts)
    )
    if not remaining:
        campaign.status = CampaignStatus.completed
        campaign.finished_at = datetime.now(timezone.utc)

    await db.commit()
    return {"dispatched": dispatched, "status": campaign.status, "remaining": int(remaining or 0)}


async def recompute_counters(db: AsyncSession, campaign: VoiceCampaign) -> None:
    """Refresh total/completed/failed counters from the contact rows."""
    total = await db.scalar(
        select(func.count()).select_from(VoiceCampaignContact)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
    )
    completed = await db.scalar(
        select(func.count()).select_from(VoiceCampaignContact)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
        .where(VoiceCampaignContact.status == CampaignContactStatus.completed)
    )
    failed = await db.scalar(
        select(func.count()).select_from(VoiceCampaignContact)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
        .where(VoiceCampaignContact.status == CampaignContactStatus.failed)
    )
    campaign.total_contacts = int(total or 0)
    campaign.completed_contacts = int(completed or 0)
    campaign.failed_contacts = int(failed or 0)
