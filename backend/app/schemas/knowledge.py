"""Pydantic schemas for the Knowledge Base / Documents API (Phase 6)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ──────────────── Knowledge Bases ────────────────

class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, description="draft | active | archived")


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = None
    status: Optional[str] = None


class KnowledgeBaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: str
    document_count: int = 0
    created_at: datetime
    updated_at: datetime


class KnowledgeBaseListResponse(BaseModel):
    items: list[KnowledgeBaseRead]
    total: int
    limit: int
    offset: int


# ──────────────── Documents ────────────────

class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    organization_id: uuid.UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    s3_key: str
    status: str
    chunk_count: int = 0
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_error: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentRead]
    total: int
    limit: int
    offset: int


# ──────────────── Document Chunks (read-only for now) ────────────────

class ChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    content: str
    chunk_metadata: dict[str, Any] = Field(default_factory=dict)


# ──────────────── Dashboard ────────────────

class KnowledgeStats(BaseModel):
    total_knowledge_bases: int
    total_documents: int
    total_chunks: int
