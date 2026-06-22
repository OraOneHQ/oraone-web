"""Document — one uploaded source file inside a KnowledgeBase.

Binary content lives in object storage (S3 in prod; local disk in dev).
Only metadata + the storage key is persisted in Postgres.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.database.models.document_chunk import DocumentChunk
    from app.database.models.knowledge_base import KnowledgeBase


class DocumentStatus(str, enum.Enum):
    pending = "pending"        # uploaded, awaiting processing
    processing = "processing"  # chunking / embedding in flight
    processed = "processed"    # ready for retrieval
    failed = "failed"          # processing failed


class Document(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_knowledge_base_id", "knowledge_base_id"),
        Index("ix_documents_organization_id", "organization_id"),
        Index("ix_documents_status", "status"),
    )

    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Denormalised from knowledge_bases.organization_id so every tenant
    # scope check stays cheap (single-table predicate).
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[Optional[str]] = mapped_column(String(80))
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        nullable=False,
        default=DocumentStatus.pending,
    )

    # Processing telemetry (Phase 7)
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    processing_error: Mapped[Optional[str]] = mapped_column(String(1000))

    knowledge_base: Mapped["KnowledgeBase"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Document {self.filename} ({self.status})>"
