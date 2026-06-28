"""Voice compliance API — Do-Not-Call / suppression list (Product 2 #16).

Lets an operator manage the org's suppression list (DND / opt-out / complaint /
bounce / manual) that the outbound dialer honours before every call. Also
exposes a fast ``check`` endpoint and an in-call ``opt-out`` capture so a caller
who asks to stop being contacted is suppressed immediately.
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    SuppressionEntry,
    SuppressionReason,
    SuppressionSource,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.services.audit import audit
from app.services.voice.suppression import (
    add_suppression,
    bulk_add_suppression,
    is_suppressed,
    normalize_phone,
)

router = APIRouter(tags=["voice-compliance"])


# ───────────────────────────────── schemas ───────────────────────────────────

class SuppressionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    reason: str
    source: str
    note: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SuppressionListResponse(BaseModel):
    items: list[SuppressionRead]
    total: int


class SuppressionCreate(BaseModel):
    phone_number: str = Field(min_length=3, max_length=40)
    reason: str = Field(default=SuppressionReason.manual)
    note: Optional[str] = Field(default=None, max_length=2000)
    expires_at: Optional[datetime] = None


class SuppressionImport(BaseModel):
    phone_numbers: list[str] = Field(min_length=1, max_length=50_000)
    reason: str = Field(default=SuppressionReason.dnd)


class SuppressionImportResponse(BaseModel):
    added: int


class SuppressionCheckResponse(BaseModel):
    phone_number: str
    suppressed: bool
    reason: Optional[str] = None
    source: Optional[str] = None


class OptOutRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=40)
    note: Optional[str] = Field(default=None, max_length=2000)


# ───────────────────────────────── endpoints ─────────────────────────────────

@router.get("/api/voice/compliance/suppression", response_model=SuppressionListResponse)
async def list_suppression(
    search: Optional[str] = Query(default=None),
    reason: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SuppressionEntry).where(
        SuppressionEntry.organization_id == ctx.organization_id
    )
    if reason:
        stmt = stmt.where(SuppressionEntry.reason == reason)
    if search:
        digits = "".join(ch for ch in search if ch.isdigit())
        if digits:
            stmt = stmt.where(SuppressionEntry.phone_number.ilike(f"%{digits}%"))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(
        stmt.order_by(desc(SuppressionEntry.created_at)).limit(limit).offset(offset)
    )
    return SuppressionListResponse(items=list(rows.all()), total=int(total or 0))


@router.post(
    "/api/voice/compliance/suppression",
    response_model=SuppressionRead,
    status_code=201,
)
async def add_suppression_entry(
    payload: SuppressionCreate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    if not normalize_phone(payload.phone_number):
        raise HTTPException(status_code=400, detail="Invalid phone number.")
    entry = await add_suppression(
        db,
        ctx.organization_id,
        payload.phone_number,
        reason=payload.reason,
        source=SuppressionSource.manual,
        note=payload.note,
        expires_at=payload.expires_at,
        created_by=ctx.user_id,
    )
    if entry is None:
        raise HTTPException(status_code=400, detail="Invalid phone number.")
    await db.commit()
    await db.refresh(entry)
    audit(
        "create", resource="voice_suppression", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"reason": entry.reason},
    )
    return entry


@router.post(
    "/api/voice/compliance/suppression/import",
    response_model=SuppressionImportResponse,
)
async def import_suppression(
    payload: SuppressionImport,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-import numbers (e.g. a DND registry export) as a JSON array."""
    added = await bulk_add_suppression(
        db,
        ctx.organization_id,
        payload.phone_numbers,
        reason=payload.reason,
        source=SuppressionSource.import_,
        created_by=ctx.user_id,
    )
    await db.commit()
    audit(
        "import", resource="voice_suppression",
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"added": added, "reason": payload.reason},
    )
    return SuppressionImportResponse(added=added)


@router.post(
    "/api/voice/compliance/suppression/import-csv",
    response_model=SuppressionImportResponse,
)
async def import_suppression_csv(
    request: Request,
    reason: str = Query(default=SuppressionReason.dnd),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-import from a raw CSV body — first phone-like column per row."""
    raw = (await request.body()).decode("utf-8-sig", errors="replace")
    if not raw.strip():
        raise HTTPException(status_code=400, detail="CSV body is empty.")
    numbers: list[str] = []
    for row in csv.reader(io.StringIO(raw)):
        for cell in row:
            if normalize_phone(cell):
                numbers.append(cell)
                break
        if len(numbers) >= 50_000:
            break
    if not numbers:
        raise HTTPException(status_code=400, detail="No phone numbers found in the CSV.")
    added = await bulk_add_suppression(
        db, ctx.organization_id, numbers,
        reason=reason, source=SuppressionSource.import_, created_by=ctx.user_id,
    )
    await db.commit()
    audit(
        "import", resource="voice_suppression",
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"added": added, "reason": reason, "via": "csv"},
    )
    return SuppressionImportResponse(added=added)


@router.get(
    "/api/voice/compliance/suppression/check",
    response_model=SuppressionCheckResponse,
)
async def check_suppression(
    phone: str = Query(min_length=3),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    entry = await is_suppressed(db, ctx.organization_id, phone)
    return SuppressionCheckResponse(
        phone_number=normalize_phone(phone),
        suppressed=entry is not None,
        reason=entry.reason if entry else None,
        source=entry.source if entry else None,
    )


@router.post(
    "/api/voice/compliance/opt-out",
    response_model=SuppressionRead,
    status_code=201,
)
async def opt_out(
    payload: OptOutRequest,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Record a caller's opt-out request — suppresses the number immediately."""
    entry = await add_suppression(
        db, ctx.organization_id, payload.phone_number,
        reason=SuppressionReason.opt_out, source=SuppressionSource.call,
        note=payload.note, created_by=ctx.user_id,
    )
    if entry is None:
        raise HTTPException(status_code=400, detail="Invalid phone number.")
    await db.commit()
    await db.refresh(entry)
    audit(
        "opt_out", resource="voice_suppression", resource_id=str(entry.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return entry


@router.delete(
    "/api/voice/compliance/suppression/{entry_id}", status_code=204
)
async def delete_suppression(
    entry_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(SuppressionEntry)
        .where(SuppressionEntry.id == entry_id)
        .where(SuppressionEntry.organization_id == ctx.organization_id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Entry not found.")
    await db.commit()
    audit(
        "delete", resource="voice_suppression", resource_id=str(entry_id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
    )
    return None
