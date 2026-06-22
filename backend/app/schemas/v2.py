"""Request/response schemas for the tenant-scoped business API (Phase 5)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ──────────────── Agents ────────────────

class AgentIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    type: str
    description: Optional[str] = None
    model: str = "gpt-4o-mini"
    status: str = "draft"
    avatar_url: Optional[str] = None


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    type: str
    status: str
    description: Optional[str] = None
    model: str
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ──────────────── Conversations ────────────────

class ConversationIn(BaseModel):
    agent_id: uuid.UUID
    channel: str
    status: str = "active"
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    started_at: Optional[datetime] = None
    summary: Optional[str] = None
    extra: dict[str, Any] = Field(default_factory=dict)


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: uuid.UUID
    channel: str
    status: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    summary: Optional[str] = None
    created_at: datetime


# ──────────────── Messages ────────────────

class MessageIn(BaseModel):
    sender: str
    message: str
    audio_url: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: str
    message: str
    audio_url: Optional[str] = None
    created_at: datetime


# ──────────────── Integrations ────────────────

class IntegrationIn(BaseModel):
    provider: str = Field(..., min_length=1, max_length=60)
    type: str
    status: str = "disconnected"
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    provider: str
    type: str
    status: str
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
