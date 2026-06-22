"""Knowledge Base & Documents API (Phase 6).

Endpoints
---------
* ``POST   /api/knowledge-bases``         — create a knowledge base
* ``GET    /api/knowledge-bases``         — list (paginated, searchable)
* ``GET    /api/knowledge-bases/{id}``    — get one
* ``PUT    /api/knowledge-bases/{id}``    — partial update
* ``DELETE /api/knowledge-bases/{id}``    — soft delete (owner/admin)
* ``POST   /api/documents/upload``        — multipart upload (writes to S3 / local)
* ``GET    /api/documents``               — list (paginated, filterable)
* ``GET    /api/documents/{id}``          — get one
* ``DELETE /api/documents/{id}``          — soft delete (owner/admin)
* ``GET    /api/knowledge/stats``         — dashboard counters

Foundation only — chunking, embeddings, and vector search are out of
scope here. The ``document_chunks`` table is created by the migration
but is not populated yet.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.document import Document, DocumentStatus
from app.database.models.document_chunk import DocumentChunk
from app.database.models.knowledge_base import KnowledgeBase, KnowledgeBaseStatus
from app.database.session import get_db
from app.middleware.org_context import (
    OrgContext,
    get_current_organization,
    require_role,
)
from app.schemas.knowledge import (
    ChunkRead,
    DocumentListResponse,
    DocumentRead,
    KnowledgeBaseCreate,
    KnowledgeBaseListResponse,
    KnowledgeBaseRead,
    KnowledgeBaseUpdate,
    KnowledgeStats,
)
from app.services import storage
from app.services.audit import audit
from app.services.document_processing import process_document


def _doc_to_read(doc: Document, *, chunk_count: int) -> DocumentRead:
    """Compose the DocumentRead payload, deriving ``processing_time_ms``."""
    elapsed_ms = None
    if doc.processing_started_at and doc.processing_completed_at:
        elapsed_ms = int(
            (doc.processing_completed_at - doc.processing_started_at).total_seconds()
            * 1000
        )
    return DocumentRead.model_validate(
        {
            **doc.__dict__,
            "chunk_count": chunk_count,
            "processing_time_ms": elapsed_ms,
        }
    )


router = APIRouter(tags=["knowledge"])


# ─────────────────── helpers ───────────────────

def _parse_enum(enum_cls, value, *, field: str):
    try:
        return enum_cls(value)
    except ValueError as e:
        valid = ", ".join(repr(m.value) for m in enum_cls)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field} {value!r}. Allowed: {valid}.",
        ) from e


async def _kb_for_org(
    session: AsyncSession, *, kb_id: uuid.UUID, organization_id: uuid.UUID
) -> Optional[KnowledgeBase]:
    return await session.scalar(
        select(KnowledgeBase)
        .where(KnowledgeBase.id == kb_id)
        .where(KnowledgeBase.organization_id == organization_id)
        .where(KnowledgeBase.deleted_at.is_(None))
    )


async def _doc_for_org(
    session: AsyncSession, *, doc_id: uuid.UUID, organization_id: uuid.UUID
) -> Optional[Document]:
    return await session.scalar(
        select(Document)
        .where(Document.id == doc_id)
        .where(Document.organization_id == organization_id)
        .where(Document.deleted_at.is_(None))
    )


async def _doc_count_for_kb(session: AsyncSession, kb_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.count(Document.id))
            .where(Document.knowledge_base_id == kb_id)
            .where(Document.deleted_at.is_(None))
        )
        or 0
    )


async def _chunk_count_for_doc(session: AsyncSession, doc_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.count(DocumentChunk.id)).where(
                DocumentChunk.document_id == doc_id
            )
        )
        or 0
    )


# ─────────────────── Knowledge Bases ───────────────────

@router.post(
    "/api/knowledge-bases",
    response_model=KnowledgeBaseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a knowledge base",
    description=(
        "Creates an empty knowledge base. Documents are attached later via "
        "`POST /api/documents/upload`. Defaults `status` to `draft`."
    ),
)
async def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeBaseRead:
    kb_status = (
        _parse_enum(KnowledgeBaseStatus, payload.status, field="status")
        if payload.status
        else KnowledgeBaseStatus.draft
    )
    kb = KnowledgeBase(
        organization_id=ctx.organization_id,
        name=payload.name,
        description=payload.description,
        status=kb_status,
    )
    session.add(kb)
    await session.commit()
    await session.refresh(kb)
    audit(
        "create",
        resource="knowledge_base",
        resource_id=str(kb.id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
        after={"name": kb.name, "status": kb.status.value},
    )
    return KnowledgeBaseRead.model_validate({**kb.__dict__, "document_count": 0})


@router.get(
    "/api/knowledge-bases",
    response_model=KnowledgeBaseListResponse,
    summary="List knowledge bases",
    description=(
        "Paginated list. Free-text search via `q` matches `name` and `description`. "
        "Filter by `status`. Soft-deleted rows are excluded."
    ),
)
async def list_knowledge_bases(
    q: Optional[str] = Query(default=None, max_length=200),
    status_: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(
        default="-created_at",
        pattern="^-?(created_at|updated_at|name)$",
        description="Sort field. Prefix with `-` for descending.",
    ),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeBaseListResponse:
    filters = [
        KnowledgeBase.organization_id == ctx.organization_id,
        KnowledgeBase.deleted_at.is_(None),
    ]
    if q:
        like = f"%{q.strip()}%"
        filters.append(or_(KnowledgeBase.name.ilike(like), KnowledgeBase.description.ilike(like)))
    if status_:
        filters.append(KnowledgeBase.status == _parse_enum(KnowledgeBaseStatus, status_, field="status"))

    total = int(
        await session.scalar(select(func.count(KnowledgeBase.id)).where(*filters)) or 0
    )

    sort_field = sort.lstrip("-")
    sort_dir = desc if sort.startswith("-") else asc
    col = {
        "created_at": KnowledgeBase.created_at,
        "updated_at": KnowledgeBase.updated_at,
        "name": KnowledgeBase.name,
    }[sort_field]

    rows = (
        await session.scalars(
            select(KnowledgeBase)
            .where(*filters)
            .order_by(sort_dir(col))
            .limit(limit)
            .offset(offset)
        )
    ).all()

    items: list[KnowledgeBaseRead] = []
    for kb in rows:
        items.append(
            KnowledgeBaseRead.model_validate(
                {**kb.__dict__, "document_count": await _doc_count_for_kb(session, kb.id)}
            )
        )

    return KnowledgeBaseListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/api/knowledge-bases/{kb_id}",
    response_model=KnowledgeBaseRead,
    summary="Get one knowledge base",
)
async def get_knowledge_base(
    kb_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeBaseRead:
    kb = await _kb_for_org(session, kb_id=kb_id, organization_id=ctx.organization_id)
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found.")
    return KnowledgeBaseRead.model_validate(
        {**kb.__dict__, "document_count": await _doc_count_for_kb(session, kb.id)}
    )


@router.put(
    "/api/knowledge-bases/{kb_id}",
    response_model=KnowledgeBaseRead,
    summary="Update a knowledge base",
    description="Partial update — any omitted field is left unchanged.",
)
async def update_knowledge_base(
    kb_id: uuid.UUID,
    payload: KnowledgeBaseUpdate,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeBaseRead:
    kb = await _kb_for_org(session, kb_id=kb_id, organization_id=ctx.organization_id)
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found.")
    before = {"name": kb.name, "status": kb.status.value, "description": kb.description}
    if payload.name is not None:
        kb.name = payload.name
    if payload.description is not None:
        kb.description = payload.description
    if payload.status is not None:
        kb.status = _parse_enum(KnowledgeBaseStatus, payload.status, field="status")
    await session.commit()
    await session.refresh(kb)
    audit(
        "update",
        resource="knowledge_base",
        resource_id=str(kb.id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
        before=before,
        after={"name": kb.name, "status": kb.status.value, "description": kb.description},
    )
    return KnowledgeBaseRead.model_validate(
        {**kb.__dict__, "document_count": await _doc_count_for_kb(session, kb.id)}
    )


@router.delete(
    "/api/knowledge-bases/{kb_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Soft-delete a knowledge base",
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def delete_knowledge_base(
    kb_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Response:
    kb = await _kb_for_org(session, kb_id=kb_id, organization_id=ctx.organization_id)
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found.")
    kb.deleted_at = datetime.now(timezone.utc)
    await session.commit()
    audit(
        "delete",
        resource="knowledge_base",
        resource_id=str(kb_id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─────────────────── Documents ───────────────────

# Size cap for the upload path. Keep it small enough to be a sane
# default; ops can bump via env later if needed.
_DEFAULT_MAX_BYTES = 25 * 1024 * 1024  # 25 MiB


@router.post(
    "/api/documents/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document into a knowledge base",
    description=(
        "Multipart upload. Required form fields: "
        "`knowledge_base_id` (UUID) and `file` (the binary). "
        "The file body is streamed to S3 if `S3_BUCKET` is configured, "
        "otherwise to a local upload directory. A `documents` row is "
        "created in `pending` status — chunking + embedding happen in a "
        "later phase."
    ),
)
async def upload_document(
    background_tasks: BackgroundTasks,
    knowledge_base_id: uuid.UUID = Form(..., description="Target knowledge base UUID."),
    file: UploadFile = File(..., description="Source file (PDF, TXT, DOCX, etc.)."),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> DocumentRead:
    kb = await _kb_for_org(
        session, kb_id=knowledge_base_id, organization_id=ctx.organization_id
    )
    if kb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found.")

    # Read the whole body so we can both size-check and stream into storage.
    body = await file.read()
    if len(body) > _DEFAULT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {_DEFAULT_MAX_BYTES} bytes.",
        )

    from io import BytesIO

    key = storage.build_key(
        organization_id=str(ctx.organization_id),
        knowledge_base_id=str(kb.id),
        filename=file.filename or "upload.bin",
    )
    s3_key = storage.put_object(
        key=key, body=BytesIO(body), content_type=file.content_type
    )

    doc = Document(
        knowledge_base_id=kb.id,
        organization_id=ctx.organization_id,
        filename=file.filename or "upload.bin",
        file_type=file.content_type,
        file_size=len(body),
        s3_key=s3_key,
        status=DocumentStatus.pending,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)

    audit(
        "create",
        resource="document",
        resource_id=str(doc.id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
        after={
            "filename": doc.filename,
            "file_size": doc.file_size,
            "file_type": doc.file_type,
            "knowledge_base_id": str(doc.knowledge_base_id),
        },
    )

    # Phase 7: kick off processing in the background. The HTTP response
    # returns immediately while the worker chunks the file. Subsequent
    # polls of /api/documents/{id} or /api/documents/{id}/chunks show
    # the live status transition pending → processing → processed.
    background_tasks.add_task(process_document, doc.id)

    return _doc_to_read(doc, chunk_count=0)


@router.get(
    "/api/documents",
    response_model=DocumentListResponse,
    summary="List documents",
    description="Paginated. Filter by `knowledge_base_id`, `status`, or free-text `q` on filename.",
)
async def list_documents(
    knowledge_base_id: Optional[uuid.UUID] = Query(default=None),
    status_: Optional[str] = Query(default=None, alias="status"),
    q: Optional[str] = Query(default=None, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    filters = [
        Document.organization_id == ctx.organization_id,
        Document.deleted_at.is_(None),
    ]
    if knowledge_base_id is not None:
        filters.append(Document.knowledge_base_id == knowledge_base_id)
    if status_:
        filters.append(Document.status == _parse_enum(DocumentStatus, status_, field="status"))
    if q:
        filters.append(Document.filename.ilike(f"%{q.strip()}%"))

    total = int(await session.scalar(select(func.count(Document.id)).where(*filters)) or 0)

    rows = (
        await session.scalars(
            select(Document)
            .where(*filters)
            .order_by(desc(Document.created_at))
            .limit(limit)
            .offset(offset)
        )
    ).all()

    items: list[DocumentRead] = []
    for d in rows:
        items.append(
            _doc_to_read(d, chunk_count=await _chunk_count_for_doc(session, d.id))
        )

    return DocumentListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/api/documents/{document_id}",
    response_model=DocumentRead,
    summary="Get one document",
)
async def get_document(
    document_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> DocumentRead:
    doc = await _doc_for_org(session, doc_id=document_id, organization_id=ctx.organization_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _doc_to_read(doc, chunk_count=await _chunk_count_for_doc(session, doc.id))


@router.post(
    "/api/documents/{document_id}/process",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="(Re)trigger processing for a document",
    description=(
        "Kicks off the extract → normalise → chunk pipeline in the "
        "background. The response is the current document state with "
        "`status='processing'`; poll `GET /api/documents/{id}` or "
        "`/chunks` for progress. Reprocessing wipes any existing chunks "
        "for this document and rebuilds them from the source file."
    ),
)
async def process_document_endpoint(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> DocumentRead:
    doc = await _doc_for_org(session, doc_id=document_id, organization_id=ctx.organization_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Flip status optimistically so polling sees movement immediately.
    doc.status = DocumentStatus.processing
    doc.processing_started_at = datetime.now(timezone.utc)
    doc.processing_completed_at = None
    doc.processing_error = None
    await session.commit()
    await session.refresh(doc)

    audit(
        "process",
        resource="document",
        resource_id=str(doc.id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
        meta={"trigger": "manual"},
    )

    background_tasks.add_task(process_document, doc.id)
    return _doc_to_read(doc, chunk_count=await _chunk_count_for_doc(session, doc.id))


@router.get(
    "/api/documents/{document_id}/chunks",
    response_model=list[ChunkRead],
    summary="List chunks for a document",
    description=(
        "Returns chunks ordered by `chunk_index`. Empty until chunking lands "
        "in a later phase."
    ),
)
async def list_chunks(
    document_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> list[ChunkRead]:
    doc = await _doc_for_org(session, doc_id=document_id, organization_id=ctx.organization_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    rows = (
        await session.scalars(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == doc.id)
            .order_by(asc(DocumentChunk.chunk_index))
            .limit(limit)
        )
    ).all()
    return [ChunkRead.model_validate(c, from_attributes=True) for c in rows]


@router.delete(
    "/api/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Soft-delete a document",
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def delete_document(
    document_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Response:
    doc = await _doc_for_org(session, doc_id=document_id, organization_id=ctx.organization_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    doc.deleted_at = datetime.now(timezone.utc)
    await session.commit()
    audit(
        "delete",
        resource="document",
        resource_id=str(document_id),
        organization_id=str(ctx.organization_id),
        user_id=str(ctx.user_id),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─────────────────── Dashboard stats ───────────────────

@router.get(
    "/api/knowledge/stats",
    response_model=KnowledgeStats,
    summary="Dashboard counters",
    description="Totals for the caller's organization: knowledge bases, documents, chunks.",
)
async def knowledge_stats(
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeStats:
    kbs = int(
        await session.scalar(
            select(func.count(KnowledgeBase.id))
            .where(KnowledgeBase.organization_id == ctx.organization_id)
            .where(KnowledgeBase.deleted_at.is_(None))
        )
        or 0
    )
    docs = int(
        await session.scalar(
            select(func.count(Document.id))
            .where(Document.organization_id == ctx.organization_id)
            .where(Document.deleted_at.is_(None))
        )
        or 0
    )
    chunks = int(
        await session.scalar(
            select(func.count(DocumentChunk.id))
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(Document.organization_id == ctx.organization_id)
            .where(Document.deleted_at.is_(None))
        )
        or 0
    )
    return KnowledgeStats(
        total_knowledge_bases=kbs,
        total_documents=docs,
        total_chunks=chunks,
    )
