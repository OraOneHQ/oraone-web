"""Outbound campaign REST API (Phase 8).

CRUD for campaigns + their contact lists, plus lifecycle controls
(start / pause / resume) and a manual batch dispatcher. Bulk contact upload
accepts a JSON array (the frontend parses CSV client-side) so we avoid a
multipart dependency here.
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent
from app.database.models.voice import (
    CampaignContactStatus,
    CampaignStatus,
    VoiceCampaign,
    VoiceCampaignContact,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.schemas.voice import (
    CampaignContactListResponse,
    CampaignContactsAdd,
    CampaignCreate,
    CampaignListResponse,
    CampaignRead,
    CampaignUpdate,
)
from app.services.audit import audit
from app.services.voice.campaign_optimizer import optimize_campaign
from app.services.voice.campaigns import dispatch_next_batch, recompute_counters

router = APIRouter(tags=["voice-campaigns"])


async def _campaign_for_org(
    db: AsyncSession, campaign_id: uuid.UUID, org_id: uuid.UUID
) -> VoiceCampaign:
    campaign = await db.scalar(
        select(VoiceCampaign)
        .where(VoiceCampaign.id == campaign_id)
        .where(VoiceCampaign.organization_id == org_id)
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@router.get("/api/voice/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VoiceCampaign).where(VoiceCampaign.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(VoiceCampaign.status == status_filter)
    total = await db.scalar(
        select(func.count()).select_from(stmt.subquery())
    )
    rows = await db.scalars(
        stmt.order_by(desc(VoiceCampaign.created_at)).limit(limit).offset(offset)
    )
    return CampaignListResponse(items=list(rows.all()), total=int(total or 0))


@router.post("/api/voice/campaigns", response_model=CampaignRead, status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    agent = await db.scalar(
        select(Agent)
        .where(Agent.id == payload.agent_id)
        .where(Agent.organization_id == ctx.organization_id)
        .where(Agent.deleted_at.is_(None))
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    campaign = VoiceCampaign(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        name=payload.name,
        description=payload.description,
        goal=payload.goal,
        from_number=payload.from_number,
        script=payload.script,
        max_attempts=payload.max_attempts,
        concurrency=payload.concurrency,
        scheduled_at=payload.scheduled_at,
        configuration=payload.configuration or {},
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    audit(
        "create", resource="voice_campaign", resource_id=str(campaign.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return campaign


@router.get("/api/voice/campaigns/{campaign_id}", response_model=CampaignRead)
async def get_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    return await _campaign_for_org(db, campaign_id, ctx.organization_id)


@router.patch("/api/voice/campaigns/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    if campaign.status in CampaignStatus.FINISHED:
        raise HTTPException(status_code=409, detail="Campaign is finished and cannot be edited.")
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, field_name, value)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/api/voice/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    await db.delete(campaign)
    await db.commit()
    audit(
        "delete", resource="voice_campaign", resource_id=str(campaign_id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return None


# ───────────────────────────── contacts ─────────────────────────────

@router.get(
    "/api/voice/campaigns/{campaign_id}/contacts",
    response_model=CampaignContactListResponse,
)
async def list_contacts(
    campaign_id: uuid.UUID,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    await _campaign_for_org(db, campaign_id, ctx.organization_id)
    stmt = select(VoiceCampaignContact).where(VoiceCampaignContact.campaign_id == campaign_id)
    if status_filter:
        stmt = stmt.where(VoiceCampaignContact.status == status_filter)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(VoiceCampaignContact.created_at).limit(limit).offset(offset)
    )
    return CampaignContactListResponse(items=list(rows.all()), total=int(total or 0))


@router.post(
    "/api/voice/campaigns/{campaign_id}/contacts",
    response_model=CampaignContactListResponse,
    status_code=201,
)
async def add_contacts(
    campaign_id: uuid.UUID,
    payload: CampaignContactsAdd,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-add contacts (CSV is parsed client-side into JSON)."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    created: list[VoiceCampaignContact] = []
    for c in payload.contacts:
        phone = (c.phone_number or "").strip()
        if not phone:
            continue
        contact = VoiceCampaignContact(
            campaign_id=campaign.id,
            name=c.name,
            phone_number=phone,
            variables=c.variables or {},
            status=CampaignContactStatus.pending,
        )
        db.add(contact)
        created.append(contact)
    await db.flush()
    await recompute_counters(db, campaign)
    await db.commit()
    for c in created:
        await db.refresh(c)
    return CampaignContactListResponse(items=created, total=len(created))


# Column aliases we accept from an uploaded CSV when locating the phone/name.
_PHONE_HEADERS = {"phone", "phone_number", "phonenumber", "mobile", "number", "tel", "telephone", "contact"}
_NAME_HEADERS = {"name", "full_name", "fullname", "contact_name", "customer", "customer_name"}
_MAX_CSV_ROWS = 50_000


@router.post(
    "/api/voice/campaigns/{campaign_id}/contacts/upload",
    response_model=CampaignContactListResponse,
    status_code=201,
)
async def upload_contacts_csv(
    campaign_id: uuid.UUID,
    request: Request,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-add contacts from a raw CSV body (``Content-Type: text/csv``).

    The first row is treated as a header. A phone column is required (any of
    ``phone``/``phone_number``/``mobile``/``number``/…); an optional name column
    is detected; every other column becomes a per-contact template ``variable``
    (usable in the campaign script, e.g. ``{{amount}}``). Sending CSV as the
    request body avoids a multipart dependency.
    """
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    raw = (await request.body()).decode("utf-8-sig", errors="replace")
    if not raw.strip():
        raise HTTPException(status_code=400, detail="CSV body is empty.")

    reader = csv.reader(io.StringIO(raw))
    try:
        header = next(reader)
    except StopIteration:
        raise HTTPException(status_code=400, detail="CSV has no rows.")
    norm = [(h or "").strip().lower() for h in header]

    phone_idx = next((i for i, h in enumerate(norm) if h in _PHONE_HEADERS), None)
    if phone_idx is None:
        raise HTTPException(
            status_code=400,
            detail="CSV must include a phone column (phone, phone_number, mobile, number, …).",
        )
    name_idx = next((i for i, h in enumerate(norm) if h in _NAME_HEADERS), None)

    created: list[VoiceCampaignContact] = []
    skipped = 0
    for row in reader:
        if len(created) >= _MAX_CSV_ROWS:
            break
        if not row or phone_idx >= len(row):
            skipped += 1
            continue
        phone = (row[phone_idx] or "").strip()
        if not phone:
            skipped += 1
            continue
        name = (row[name_idx].strip() if name_idx is not None and name_idx < len(row) else None) or None
        variables = {
            norm[i]: row[i].strip()
            for i in range(min(len(row), len(norm)))
            if i not in (phone_idx, name_idx) and norm[i] and row[i].strip()
        }
        contact = VoiceCampaignContact(
            campaign_id=campaign.id,
            name=name,
            phone_number=phone,
            variables=variables,
            status=CampaignContactStatus.pending,
        )
        db.add(contact)
        created.append(contact)

    if not created:
        raise HTTPException(status_code=400, detail="No valid contacts found in the CSV.")
    await db.flush()
    await recompute_counters(db, campaign)
    await db.commit()
    for c in created:
        await db.refresh(c)
    audit(
        "upload", resource="voice_campaign_contacts", resource_id=str(campaign.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"added": len(created), "skipped": skipped},
    )
    return CampaignContactListResponse(items=created, total=len(created))


@router.delete(
    "/api/voice/campaigns/{campaign_id}/contacts/{contact_id}",
    status_code=204,
)
async def delete_contact(
    campaign_id: uuid.UUID,
    contact_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    contact = await db.scalar(
        select(VoiceCampaignContact)
        .where(VoiceCampaignContact.id == contact_id)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
    )
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    await db.delete(contact)
    await recompute_counters(db, campaign)
    await db.commit()
    return None


# ───────────────────────────── lifecycle ─────────────────────────────

@router.post("/api/voice/campaigns/{campaign_id}/start", response_model=CampaignRead)
async def start_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Start (or resume) a campaign and dispatch the first batch."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    if campaign.status in CampaignStatus.FINISHED:
        raise HTTPException(status_code=409, detail="Campaign is finished.")
    await recompute_counters(db, campaign)
    if campaign.total_contacts == 0:
        raise HTTPException(status_code=400, detail="Add contacts before starting.")
    campaign.status = CampaignStatus.running
    if campaign.started_at is None:
        campaign.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(campaign)
    # Kick the first batch synchronously so the caller sees immediate progress.
    await dispatch_next_batch(db, campaign)
    await db.refresh(campaign)
    audit(
        "start", resource="voice_campaign", resource_id=str(campaign.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return campaign


@router.post("/api/voice/campaigns/{campaign_id}/pause", response_model=CampaignRead)
async def pause_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    if campaign.status == CampaignStatus.running:
        campaign.status = CampaignStatus.paused
        await db.commit()
        await db.refresh(campaign)
    return campaign


@router.post("/api/voice/campaigns/{campaign_id}/dispatch", response_model=CampaignRead)
async def dispatch_batch(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Manually dial the next batch (what a scheduled worker would call)."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    await dispatch_next_batch(db, campaign)
    await db.refresh(campaign)
    return campaign


# ───────────────────────── bulk actions (Product 2 #15) ──────────────────────

@router.post("/api/voice/campaigns/{campaign_id}/clone", response_model=CampaignRead, status_code=201)
async def clone_campaign(
    campaign_id: uuid.UUID,
    copy_contacts: bool = Query(default=True),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a campaign as a fresh ``draft`` (optionally with its contacts).

    Cloned contacts are reset to ``pending`` with zeroed attempts so the copy
    can be started cleanly.
    """
    src = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    clone = VoiceCampaign(
        organization_id=src.organization_id,
        project_id=src.project_id,
        agent_id=src.agent_id,
        name=f"{src.name} (copy)"[:200],
        description=src.description,
        goal=src.goal,
        status=CampaignStatus.draft,
        from_number=src.from_number,
        script=src.script,
        max_attempts=src.max_attempts,
        concurrency=src.concurrency,
        configuration=dict(src.configuration or {}),
    )
    db.add(clone)
    await db.flush()

    if copy_contacts:
        contacts = await db.scalars(
            select(VoiceCampaignContact).where(
                VoiceCampaignContact.campaign_id == src.id
            )
        )
        for c in contacts.all():
            db.add(VoiceCampaignContact(
                campaign_id=clone.id,
                name=c.name,
                phone_number=c.phone_number,
                variables=dict(c.variables or {}),
                status=CampaignContactStatus.pending,
            ))
        await db.flush()
        await recompute_counters(db, clone)

    await db.commit()
    await db.refresh(clone)
    audit(
        "clone", resource="voice_campaign", resource_id=str(clone.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"source": str(src.id), "copy_contacts": copy_contacts},
    )
    return clone


@router.post("/api/voice/campaigns/{campaign_id}/archive", response_model=CampaignRead)
async def archive_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Archive a campaign — hides it from the active list without deleting data."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    if campaign.status == CampaignStatus.running:
        raise HTTPException(status_code=409, detail="Pause the campaign before archiving.")
    campaign.status = CampaignStatus.archived
    await db.commit()
    await db.refresh(campaign)
    audit(
        "archive", resource="voice_campaign", resource_id=str(campaign.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return campaign


@router.post("/api/voice/campaigns/{campaign_id}/unarchive", response_model=CampaignRead)
async def unarchive_campaign(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Restore an archived campaign back to ``draft``."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    if campaign.status != CampaignStatus.archived:
        raise HTTPException(status_code=409, detail="Campaign is not archived.")
    campaign.status = CampaignStatus.draft
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/api/voice/campaigns/{campaign_id}/export")
async def export_campaign_contacts(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Export the campaign's contacts + per-contact outcomes as a CSV download."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    contacts = list((await db.scalars(
        select(VoiceCampaignContact)
        .where(VoiceCampaignContact.campaign_id == campaign.id)
        .order_by(VoiceCampaignContact.created_at)
    )).all())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["name", "phone_number", "status", "attempts", "outcome", "last_attempt_at"])
    for c in contacts:
        writer.writerow([
            c.name or "",
            c.phone_number,
            c.status,
            c.attempts,
            c.outcome or "",
            c.last_attempt_at.isoformat() if c.last_attempt_at else "",
        ])

    safe_name = "".join(ch if ch.isalnum() else "_" for ch in (campaign.name or "campaign"))[:60]
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_contacts.csv"'},
    )


# ──────────────────── AI campaign optimization (Product 2 #14) ────────────────

@router.get("/api/voice/campaigns/{campaign_id}/optimization")
async def campaign_optimization(
    campaign_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Return AI optimization insights (best hours, rates, retry tips)."""
    campaign = await _campaign_for_org(db, campaign_id, ctx.organization_id)
    return await optimize_campaign(db, campaign)
