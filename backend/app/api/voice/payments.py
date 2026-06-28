"""AI Payment Assistant API (Phase V).

Create and track payment requests the AI sends to customers across rails
(Stripe, Razorpay, PayPal, PhonePe, Google Pay, Apple Pay). Endpoints:

* GET    /api/voice/payments              — list (filter by status/provider)
* POST   /api/voice/payments              — create a request + hosted link
* GET    /api/voice/payments/{id}         — one request
* POST   /api/voice/payments/{id}/status  — advance status (sent/paid/…)
* GET    /api/voice/payments/providers    — supported rails
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import PAYMENT_PROVIDERS, PaymentRequest, PaymentStatus
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.services.audit import audit
from app.services.voice import payments as payment_service

router = APIRouter(tags=["voice-payments"])

_STATUSES = {
    PaymentStatus.pending,
    PaymentStatus.sent,
    PaymentStatus.paid,
    PaymentStatus.failed,
    PaymentStatus.canceled,
    PaymentStatus.refunded,
}


class PaymentCreate(BaseModel):
    amount_cents: int = Field(ge=1, le=1_000_000_00)
    currency: str = Field(default="usd", max_length=8)
    provider: str = Field(default="stripe", max_length=20)
    customer_name: Optional[str] = Field(default=None, max_length=200)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    customer_email: Optional[str] = Field(default=None, max_length=254)
    description: Optional[str] = Field(default=None, max_length=2000)
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None


class PaymentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|sent|paid|failed|canceled|refunded)$")
    external_id: Optional[str] = Field(default=None, max_length=200)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    description: Optional[str] = None
    amount_cents: int
    currency: str
    provider: str
    status: str
    reference: Optional[str] = None
    link_url: Optional[str] = None
    external_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PaymentListResponse(BaseModel):
    items: list[PaymentRead] = Field(default_factory=list)
    total: int = 0


@router.get("/api/voice/payments/providers")
async def list_providers(ctx: OrgContext = Depends(get_current_organization)):
    return {"items": list(PAYMENT_PROVIDERS), "total": len(PAYMENT_PROVIDERS)}


@router.get("/api/voice/payments", response_model=PaymentListResponse)
async def list_payments(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    provider: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PaymentRequest).where(PaymentRequest.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(PaymentRequest.status == status_filter)
    if provider:
        stmt = stmt.where(PaymentRequest.provider == provider)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(stmt.order_by(desc(PaymentRequest.created_at)).limit(limit).offset(offset))
    return PaymentListResponse(items=list(rows.all()), total=int(total or 0))


@router.post("/api/voice/payments", response_model=PaymentRead, status_code=201)
async def create_payment(
    payload: PaymentCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    provider = payment_service.normalize_provider(payload.provider)
    reference = payment_service.build_reference()
    link = payment_service.build_link(provider, reference)
    row = PaymentRequest(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        call_id=payload.call_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        description=payload.description,
        amount_cents=payload.amount_cents,
        currency=(payload.currency or "usd").lower(),
        provider=provider,
        status=PaymentStatus.sent,
        reference=reference,
        link_url=link,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    audit(
        "create", resource="voice_payment", resource_id=str(row.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"provider": provider, "amount_cents": payload.amount_cents},
    )
    return row


@router.get("/api/voice/payments/{payment_id}", response_model=PaymentRead)
async def get_payment(
    payment_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(PaymentRequest)
        .where(PaymentRequest.id == payment_id)
        .where(PaymentRequest.organization_id == ctx.organization_id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found.")
    return row


@router.post("/api/voice/payments/{payment_id}/status", response_model=PaymentRead)
async def update_payment_status(
    payment_id: uuid.UUID,
    payload: PaymentStatusUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(PaymentRequest)
        .where(PaymentRequest.id == payment_id)
        .where(PaymentRequest.organization_id == ctx.organization_id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found.")
    row.status = payload.status
    if payload.external_id:
        row.external_id = payload.external_id
    if payload.status == PaymentStatus.paid and row.paid_at is None:
        row.paid_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    audit(
        "update", resource="voice_payment", resource_id=str(row.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"status": payload.status},
    )
    return row
