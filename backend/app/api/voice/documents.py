"""AI Document Assistant API (Phase W).

Collect customer documents, OCR/extract structured fields, verify and sync to
CRM. Endpoints:

* GET    /api/voice/documents             — list (filter status/kind)
* POST   /api/voice/documents             — register a document
* GET    /api/voice/documents/{id}        — one document
* POST   /api/voice/documents/{id}/extract — run field extraction
* POST   /api/voice/documents/{id}/verify  — mark verified (+ optional CRM sync)
* GET    /api/voice/documents/kinds        — supported kinds + expected fields
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    DOCUMENT_KINDS,
    CustomerDocument,
    DocumentReviewStatus,
)
from app.database.session import get_db
from app.middleware.org_context import OrgContext, get_current_organization
from app.middleware.project_context import ProjectContext, get_current_project
from app.services.audit import audit
from app.services.voice.documents import KIND_FIELDS, extract_fields

router = APIRouter(tags=["voice-documents"])


class DocumentCreate(BaseModel):
    kind: str = Field(default="other", max_length=40)
    title: Optional[str] = Field(default=None, max_length=300)
    customer_name: Optional[str] = Field(default=None, max_length=200)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    url: Optional[str] = Field(default=None, max_length=1000)
    storage_key: Optional[str] = Field(default=None, max_length=1000)
    extracted_text: Optional[str] = Field(default=None)
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None


class DocumentVerify(BaseModel):
    sync_to_crm: bool = False
    fields: Optional[dict[str, Any]] = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    kind: str
    title: Optional[str] = None
    status: str
    storage_key: Optional[str] = None
    url: Optional[str] = None
    extracted_text: Optional[str] = None
    extracted_fields: dict[str, Any] = Field(default_factory=dict)
    confidence: int
    synced_to_crm: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentRead] = Field(default_factory=list)
    total: int = 0


def _normalize_kind(kind: Optional[str]) -> str:
    k = (kind or "other").strip().lower()
    return k if k in DOCUMENT_KINDS else "other"


@router.get("/api/voice/documents/kinds")
async def list_kinds(ctx: OrgContext = Depends(get_current_organization)):
    return {
        "items": [{"value": k, "fields": KIND_FIELDS.get(k, [])} for k in DOCUMENT_KINDS],
        "total": len(DOCUMENT_KINDS),
    }


@router.get("/api/voice/documents", response_model=DocumentListResponse)
async def list_documents(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    kind: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CustomerDocument).where(CustomerDocument.organization_id == ctx.organization_id)
    if status_filter:
        stmt = stmt.where(CustomerDocument.status == status_filter)
    if kind:
        stmt = stmt.where(CustomerDocument.kind == kind)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await db.scalars(stmt.order_by(desc(CustomerDocument.created_at)).limit(limit).offset(offset))
    return DocumentListResponse(items=list(rows.all()), total=int(total or 0))


@router.post("/api/voice/documents", response_model=DocumentRead, status_code=201)
async def create_document(
    payload: DocumentCreate,
    pctx: ProjectContext = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    ctx = pctx.org
    row = CustomerDocument(
        organization_id=ctx.organization_id,
        project_id=pctx.project_id,
        agent_id=payload.agent_id,
        call_id=payload.call_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        kind=_normalize_kind(payload.kind),
        title=payload.title,
        url=payload.url,
        storage_key=payload.storage_key,
        extracted_text=payload.extracted_text,
        status=DocumentReviewStatus.pending,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    audit(
        "create", resource="voice_document", resource_id=str(row.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"kind": row.kind},
    )
    return row


@router.get("/api/voice/documents/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(CustomerDocument)
        .where(CustomerDocument.id == document_id)
        .where(CustomerDocument.organization_id == ctx.organization_id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return row


@router.post("/api/voice/documents/{document_id}/extract", response_model=DocumentRead)
async def extract_document(
    document_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(CustomerDocument)
        .where(CustomerDocument.id == document_id)
        .where(CustomerDocument.organization_id == ctx.organization_id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    fields, confidence = await extract_fields(row.kind, row.extracted_text or "")
    row.extracted_fields = fields
    row.confidence = confidence
    row.status = DocumentReviewStatus.extracted if confidence > 0 else DocumentReviewStatus.processing
    await db.commit()
    await db.refresh(row)
    audit(
        "extract", resource="voice_document", resource_id=str(row.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"confidence": confidence},
    )
    return row


@router.post("/api/voice/documents/{document_id}/verify", response_model=DocumentRead)
async def verify_document(
    document_id: uuid.UUID,
    payload: DocumentVerify,
    ctx: OrgContext = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(CustomerDocument)
        .where(CustomerDocument.id == document_id)
        .where(CustomerDocument.organization_id == ctx.organization_id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if payload.fields is not None:
        row.extracted_fields = payload.fields
    row.status = DocumentReviewStatus.verified
    row.verified_at = datetime.now(timezone.utc)
    if payload.sync_to_crm:
        row.synced_to_crm = True
    await db.commit()
    await db.refresh(row)
    audit(
        "verify", resource="voice_document", resource_id=str(row.id),
        organization_id=str(ctx.organization_id), user_id=str(ctx.user_id),
        meta={"synced_to_crm": row.synced_to_crm},
    )
    return row
