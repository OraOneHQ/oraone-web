"""Voice platform models (Product 2).

Voice is an *additional channel* on the existing Workspace → Project →
Agent → Knowledge architecture. There is deliberately **no** ``voice_agents``
table: an existing :class:`~app.database.models.agent.Agent` is assigned to
the Voice channel via ``agent_channels`` and given a ``voice_profiles`` row.
Calls, transcripts and recordings hang off that.

Table map
---------
* ``agent_channels``        — which channels an Agent serves (chat/voice/…)
* ``voice_profiles``        — TTS/STT voice config for an Agent's voice channel
* ``voice_calls``           — one row per inbound/outbound call
* ``voice_messages``        — per-utterance transcript turns of a call
* ``voice_recordings``      — stored audio artifacts for a call
* ``receptionist_profiles`` — Phase 2 AI Receptionist config
* ``sales_profiles``        — Phase 3 AI Sales config
* ``support_profiles``      — Phase 4 AI Support config
* ``call_transfers``        — Phase 5 human-handoff records
* ``voice_campaigns``       — Phase 8 outbound campaign definitions
* ``voice_campaign_contacts`` — Phase 8 per-contact call queue rows

Everything is JSON-flexible (``configuration`` / ``meta`` columns) so later
phases can extend behaviour without a migration per tweak.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


# ─────────────────────────── enums (string consts) ───────────────────────────

class ChannelType:
    chat = "chat"
    voice = "voice"
    whatsapp = "whatsapp"
    email = "email"
    api = "api"
    ALL = {chat, voice, whatsapp, email, api}


class ChannelStatus:
    active = "active"
    paused = "paused"
    disabled = "disabled"
    ALL = {active, paused, disabled}


class CallDirection:
    inbound = "inbound"
    outbound = "outbound"
    ALL = {inbound, outbound}


class CallStatus:
    queued = "queued"
    ringing = "ringing"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    busy = "busy"
    no_answer = "no_answer"
    canceled = "canceled"
    transferred = "transferred"
    voicemail = "voicemail"
    ALL = {
        queued, ringing, in_progress, completed, failed, busy,
        no_answer, canceled, transferred, voicemail,
    }
    TERMINAL = {completed, failed, busy, no_answer, canceled}


class TranscriptStatus:
    pending = "pending"
    partial = "partial"
    completed = "completed"
    failed = "failed"
    ALL = {pending, partial, completed, failed}


class SpeakerRole:
    caller = "caller"      # the human on the phone
    agent = "agent"        # the AI
    human = "human"        # a human operator after handoff
    system = "system"      # system/IVR prompts
    ALL = {caller, agent, human, system}


class TransferStatus:
    requested = "requested"
    ringing = "ringing"
    connected = "connected"
    completed = "completed"
    failed = "failed"
    abandoned = "abandoned"
    ALL = {requested, ringing, connected, completed, failed, abandoned}


class CampaignStatus:
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    canceled = "canceled"
    archived = "archived"
    ALL = {draft, scheduled, running, paused, completed, canceled, archived}
    # Statuses that are terminal/non-editable.
    FINISHED = {completed, canceled, archived}


class CampaignContactStatus:
    pending = "pending"
    queued = "queued"
    calling = "calling"
    completed = "completed"
    failed = "failed"
    no_answer = "no_answer"
    skipped = "skipped"
    ALL = {pending, queued, calling, completed, failed, no_answer, skipped}


# ─────────────────────────────── agent_channels ──────────────────────────────

class AgentChannel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Which channel(s) an Agent serves. Voice is one of them."""

    __tablename__ = "agent_channels"
    __table_args__ = (
        UniqueConstraint("agent_id", "channel", name="uq_agent_channels_agent_channel"),
        Index("ix_agent_channels_agent_id", "agent_id"),
        Index("ix_agent_channels_organization_id", "organization_id"),
        Index("ix_agent_channels_channel", "channel"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default=ChannelType.voice)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ChannelStatus.active, server_default=ChannelStatus.active
    )
    # Channel-specific binding (e.g. phone number for voice) + free config.
    phone_number: Mapped[Optional[str]] = mapped_column(String(32))
    provider: Mapped[Optional[str]] = mapped_column(String(40))
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )


# ─────────────────────────────── voice_profiles ──────────────────────────────

class VoiceProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """TTS/STT voice configuration for an Agent's voice channel."""

    __tablename__ = "voice_profiles"
    __table_args__ = (
        Index("ix_voice_profiles_agent_id", "agent_id"),
        Index("ix_voice_profiles_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
    )
    # TTS
    provider: Mapped[str] = mapped_column(String(40), nullable=False, default="elevenlabs")
    voice_id: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    model: Mapped[str] = mapped_column(String(80), nullable=False, default="eleven_turbo_v2_5")
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    sample_rate: Mapped[int] = mapped_column(Integer, nullable=False, default=8000, server_default="8000")
    speed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0, server_default="1")
    stability: Mapped[float] = mapped_column(Float, nullable=False, default=0.5, server_default="0.5")
    similarity_boost: Mapped[float] = mapped_column(Float, nullable=False, default=0.75, server_default="0.75")
    style: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    # STT
    stt_provider: Mapped[str] = mapped_column(String(40), nullable=False, default="deepgram")
    stt_model: Mapped[str] = mapped_column(String(80), nullable=False, default="nova-2")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )


# ─────────────────────────────────── calls ───────────────────────────────────

class VoiceCall(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One inbound/outbound phone call handled by an Agent's voice channel."""

    __tablename__ = "voice_calls"
    __table_args__ = (
        Index("ix_voice_calls_organization_id", "organization_id"),
        Index("ix_voice_calls_project_id", "project_id"),
        Index("ix_voice_calls_agent_id", "agent_id"),
        Index("ix_voice_calls_status", "status"),
        Index("ix_voice_calls_direction", "direction"),
        Index("ix_voice_calls_provider_call_sid", "provider_call_sid"),
        Index("ix_voice_calls_started_at", "started_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Optional link back to a chat conversation so the unified inbox can show it.
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("voice_campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(String(40), nullable=False, default="twilio")
    provider_call_sid: Mapped[Optional[str]] = mapped_column(String(80))
    direction: Mapped[str] = mapped_column(String(12), nullable=False, default=CallDirection.inbound)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CallStatus.queued, server_default=CallStatus.queued
    )

    caller_number: Mapped[Optional[str]] = mapped_column(String(32))
    receiver_number: Mapped[Optional[str]] = mapped_column(String(32))

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Outcome / intelligence
    end_reason: Mapped[Optional[str]] = mapped_column(String(60))
    detected_intent: Mapped[Optional[str]] = mapped_column(String(80))
    detected_language: Mapped[Optional[str]] = mapped_column(String(16))
    sentiment: Mapped[Optional[str]] = mapped_column(String(20))
    resolution: Mapped[Optional[str]] = mapped_column(String(40))  # ai_resolved/transferred/voicemail/abandoned
    summary: Mapped[Optional[str]] = mapped_column(Text)

    # Cost / quality metrics
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    avg_latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    interruptions: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    recording_url: Mapped[Optional[str]] = mapped_column(String(1000))
    transcript_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TranscriptStatus.pending, server_default=TranscriptStatus.pending
    )
    error: Mapped[Optional[str]] = mapped_column(String(1000))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


class VoiceMessage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single transcript turn (utterance) within a call."""

    __tablename__ = "voice_messages"
    __table_args__ = (
        Index("ix_voice_messages_call_id", "call_id"),
        Index("ix_voice_messages_call_seq", "call_id", "sequence"),
    )

    call_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("voice_calls.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    speaker: Mapped[str] = mapped_column(String(12), nullable=False, default=SpeakerRole.caller)
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    start_time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    end_time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    is_final: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    latency_ms: Mapped[Optional[float]] = mapped_column(Float)
    language: Mapped[Optional[str]] = mapped_column(String(16))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


class VoiceRecording(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A stored audio artifact for a call (full call or voicemail)."""

    __tablename__ = "voice_recordings"
    __table_args__ = (
        Index("ix_voice_recordings_call_id", "call_id"),
    )

    call_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("voice_calls.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False, default="twilio")
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="call")  # call|voicemail
    storage_key: Mapped[Optional[str]] = mapped_column(String(1000))
    url: Mapped[Optional[str]] = mapped_column(String(1000))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    format: Mapped[str] = mapped_column(String(16), nullable=False, default="mp3")
    transcript: Mapped[Optional[str]] = mapped_column(Text)
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ──────────────────────────── Phase 2: receptionist ──────────────────────────

class ReceptionistProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-Agent AI Receptionist configuration (Phase 2)."""

    __tablename__ = "receptionist_profiles"
    __table_args__ = (
        UniqueConstraint("agent_id", name="uq_receptionist_profiles_agent"),
        Index("ix_receptionist_profiles_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    business_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    greeting: Mapped[Optional[str]] = mapped_column(Text)
    after_hours_message: Mapped[Optional[str]] = mapped_column(Text)
    voicemail_prompt: Mapped[Optional[str]] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    default_language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    languages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    allow_recording: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    allow_voicemail: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    # business_hours, holidays, routing_rules, faq, appointment settings live here
    business_hours: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    holidays: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    routing_rules: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    appointment_settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


# ─────────────────────────────── Phase 3: sales ──────────────────────────────

class SalesProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-Agent AI Sales configuration (Phase 3)."""

    __tablename__ = "sales_profiles"
    __table_args__ = (
        UniqueConstraint("agent_id", name="uq_sales_profiles_agent"),
        Index("ix_sales_profiles_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    qualification_strategy: Mapped[str] = mapped_column(String(40), nullable=False, default="bant")
    default_pipeline: Mapped[Optional[str]] = mapped_column(String(120))
    crm_provider: Mapped[Optional[str]] = mapped_column(String(40))
    calendar_provider: Mapped[Optional[str]] = mapped_column(String(40))
    allow_quote_generation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    follow_up_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    qualification_questions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    products: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    pricing_rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


# ────────────────────────────── Phase 4: support ─────────────────────────────

class SupportProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-Agent AI Support configuration (Phase 4)."""

    __tablename__ = "support_profiles"
    __table_args__ = (
        UniqueConstraint("agent_id", name="uq_support_profiles_agent"),
        Index("ix_support_profiles_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    create_tickets: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    ticketing_provider: Mapped[Optional[str]] = mapped_column(String(40))
    escalation_rules: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    sla_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    knowledge_base_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


# ─────────────────────────── Phase 5: human handoff ──────────────────────────

class CallTransfer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A human-handoff event during a call (Phase 5)."""

    __tablename__ = "call_transfers"
    __table_args__ = (
        Index("ix_call_transfers_call_id", "call_id"),
        Index("ix_call_transfers_status", "status"),
        Index("ix_call_transfers_organization_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    call_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="CASCADE"), nullable=False
    )
    transfer_type: Mapped[str] = mapped_column(String(20), nullable=False, default="warm")  # warm|cold
    reason: Mapped[Optional[str]] = mapped_column(String(200))
    department: Mapped[Optional[str]] = mapped_column(String(80))
    queue: Mapped[Optional[str]] = mapped_column(String(80))
    target_number: Mapped[Optional[str]] = mapped_column(String(32))
    target_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TransferStatus.requested, server_default=TransferStatus.requested
    )
    requested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    connected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    wait_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    context_summary: Mapped[Optional[str]] = mapped_column(Text)
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ──────────────────────────── Phase 8: outbound ──────────────────────────────

class VoiceCampaign(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An outbound calling campaign (Phase 8)."""

    __tablename__ = "voice_campaigns"
    __table_args__ = (
        Index("ix_voice_campaigns_organization_id", "organization_id"),
        Index("ix_voice_campaigns_project_id", "project_id"),
        Index("ix_voice_campaigns_status", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    description: Mapped[Optional[str]] = mapped_column(Text)
    goal: Mapped[Optional[str]] = mapped_column(String(40))  # reminder|collection|survey|sales|notification
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CampaignStatus.draft, server_default=CampaignStatus.draft
    )
    from_number: Mapped[Optional[str]] = mapped_column(String(32))
    script: Mapped[Optional[str]] = mapped_column(Text)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3")
    concurrency: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_contacts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    completed_contacts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    failed_contacts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


class VoiceCampaignContact(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single contact (queue row) in an outbound campaign (Phase 8)."""

    __tablename__ = "voice_campaign_contacts"
    __table_args__ = (
        Index("ix_voice_campaign_contacts_campaign_id", "campaign_id"),
        Index("ix_voice_campaign_contacts_status", "status"),
    )

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_campaigns.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String(200))
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CampaignContactStatus.pending, server_default=CampaignContactStatus.pending
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    outcome: Mapped[Optional[str]] = mapped_column(String(60))
    variables: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


# ──────────────────────────── Phase 4: support tickets ───────────────────────

class TicketStatus:
    open = "open"
    pending = "pending"
    escalated = "escalated"
    resolved = "resolved"
    closed = "closed"
    ALL = {open, pending, escalated, resolved, closed}


class TicketPriority:
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"
    ALL = {low, normal, high, urgent}


class VoiceTicket(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A support ticket raised from a voice call (Phase 4).

    A first-class entity so support outcomes are queryable and can later sync
    to an external ticketing provider (the ``external_*`` columns hold that
    linkage). Falls back to a fully self-contained record when no provider is
    configured.
    """

    __tablename__ = "voice_tickets"
    __table_args__ = (
        Index("ix_voice_tickets_organization_id", "organization_id"),
        Index("ix_voice_tickets_project_id", "project_id"),
        Index("ix_voice_tickets_agent_id", "agent_id"),
        Index("ix_voice_tickets_call_id", "call_id"),
        Index("ix_voice_tickets_status", "status"),
        Index("ix_voice_tickets_priority", "priority"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    subject: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    body: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TicketStatus.open, server_default=TicketStatus.open
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TicketPriority.normal, server_default=TicketPriority.normal
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32))
    customer_email: Mapped[Optional[str]] = mapped_column(String(254))
    resolution: Mapped[Optional[str]] = mapped_column(Text)
    escalated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    external_provider: Mapped[Optional[str]] = mapped_column(String(40))
    external_id: Mapped[Optional[str]] = mapped_column(String(120))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ──────────────────────── Phase 6: voice workflow triggers ───────────────────

class VoiceTriggerType:
    intent = "intent"
    keyword = "keyword"
    phrase = "phrase"
    sentiment = "sentiment"
    call_started = "call_started"
    call_ended = "call_ended"
    ALL = {intent, keyword, phrase, sentiment, call_started, call_ended}


class VoiceWorkflowTrigger(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Binds a voice-call signal (intent/keyword/phrase/sentiment/lifecycle) to
    an existing Workflow, so conversations can launch business automations
    (Phase 6). Voice becomes another trigger source for the Product 1 engine.
    """

    __tablename__ = "voice_workflow_triggers"
    __table_args__ = (
        Index("ix_voice_workflow_triggers_organization_id", "organization_id"),
        Index("ix_voice_workflow_triggers_agent_id", "agent_id"),
        Index("ix_voice_workflow_triggers_workflow_id", "workflow_id"),
        Index("ix_voice_workflow_triggers_enabled", "enabled"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=True
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    trigger_type: Mapped[str] = mapped_column(String(20), nullable=False, default=VoiceTriggerType.intent)
    # match_values: list of strings (intents/keywords/phrases/sentiments). Empty = match any of that type.
    match_values: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100, server_default="100")
    once_per_call: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    fire_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_fired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")


# ──────────────────── Phase 9: enterprise voice library ──────────────────────

class VoiceLibraryStatus:
    pending = "pending"       # awaiting approval
    approved = "approved"     # usable
    revoked = "revoked"       # withdrawn / consent revoked
    ALL = {pending, approved, revoked}


class VoiceLibraryEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An org-owned branded / cloned voice with governance (Phase 9.3).

    Holds the catalogue + approval lifecycle for custom voices. Consent and
    provenance live in ``meta``; ``status`` drives whether a voice may be used.
    """

    __tablename__ = "voice_library"
    __table_args__ = (
        Index("ix_voice_library_organization_id", "organization_id"),
        Index("ix_voice_library_status", "status"),
        UniqueConstraint("organization_id", "slug", name="uq_voice_library_org_slug"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    slug: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    description: Mapped[Optional[str]] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, default="elevenlabs")
    provider_voice_id: Mapped[Optional[str]] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="custom")  # custom|cloned|stock
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    accent: Mapped[Optional[str]] = mapped_column(String(40))
    style_profile: Mapped[Optional[str]] = mapped_column(String(40))  # corporate|friendly|sales|...
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=VoiceLibraryStatus.pending, server_default=VoiceLibraryStatus.pending
    )
    consent_obtained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ──────────────────── Phase 2: appointments & callbacks ──────────────────────

class AppointmentStatus:
    booked = "booked"
    rescheduled = "rescheduled"
    canceled = "canceled"
    completed = "completed"
    no_show = "no_show"
    ALL = {booked, rescheduled, canceled, completed, no_show}


class VoiceAppointment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An appointment booked through the AI Receptionist (Phase 2)."""

    __tablename__ = "voice_appointments"
    __table_args__ = (
        Index("ix_voice_appointments_organization_id", "organization_id"),
        Index("ix_voice_appointments_project_id", "project_id"),
        Index("ix_voice_appointments_agent_id", "agent_id"),
        Index("ix_voice_appointments_scheduled_at", "scheduled_at"),
        Index("ix_voice_appointments_status", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32))
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    service: Mapped[Optional[str]] = mapped_column(String(200))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC", server_default="UTC")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=AppointmentStatus.booked, server_default=AppointmentStatus.booked
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


class CallbackStatus:
    pending = "pending"
    scheduled = "scheduled"
    completed = "completed"
    canceled = "canceled"
    ALL = {pending, scheduled, completed, canceled}


class VoiceCallback(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A callback request captured by the AI Receptionist (Phase 2 / TC-060)."""

    __tablename__ = "voice_callbacks"
    __table_args__ = (
        Index("ix_voice_callbacks_organization_id", "organization_id"),
        Index("ix_voice_callbacks_project_id", "project_id"),
        Index("ix_voice_callbacks_agent_id", "agent_id"),
        Index("ix_voice_callbacks_status", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    preferred_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CallbackStatus.pending, server_default=CallbackStatus.pending
    )
    workflow_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ──────────────────────── Phase V: AI Payment Assistant ──────────────────────

class PaymentStatus:
    pending = "pending"
    sent = "sent"
    paid = "paid"
    failed = "failed"
    canceled = "canceled"
    refunded = "refunded"


# Supported payment rails surfaced in the UI. Live capture happens through the
# provider integration when configured; otherwise a hosted-link placeholder is
# produced so the collection flow is testable end-to-end.
PAYMENT_PROVIDERS = (
    "stripe",
    "razorpay",
    "paypal",
    "phonepe",
    "google_pay",
    "apple_pay",
)


class PaymentRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A payment the AI asks a customer to make (collection / checkout)."""

    __tablename__ = "voice_payment_requests"
    __table_args__ = (
        Index("ix_voice_payment_requests_organization_id", "organization_id"),
        Index("ix_voice_payment_requests_project_id", "project_id"),
        Index("ix_voice_payment_requests_status", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32))
    customer_email: Mapped[Optional[str]] = mapped_column(String(254))
    description: Mapped[Optional[str]] = mapped_column(Text)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="usd", server_default="usd")
    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="stripe", server_default="stripe")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PaymentStatus.pending, server_default=PaymentStatus.pending
    )
    reference: Mapped[Optional[str]] = mapped_column(String(120))
    link_url: Mapped[Optional[str]] = mapped_column(String(1000))
    external_id: Mapped[Optional[str]] = mapped_column(String(200))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ─────────────────────── Phase W: AI Document Assistant ──────────────────────

class DocumentReviewStatus:
    pending = "pending"
    processing = "processing"
    extracted = "extracted"
    verified = "verified"
    rejected = "rejected"
    failed = "failed"


# Document kinds the assistant can read & extract via OCR.
DOCUMENT_KINDS = (
    "aadhaar",
    "pan",
    "passport",
    "driving_license",
    "resume",
    "insurance",
    "medical_report",
    "other",
)


class CustomerDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A customer-supplied document the AI collects, OCRs and pushes to CRM."""

    __tablename__ = "voice_customer_documents"
    __table_args__ = (
        Index("ix_voice_customer_documents_organization_id", "organization_id"),
        Index("ix_voice_customer_documents_project_id", "project_id"),
        Index("ix_voice_customer_documents_status", "status"),
        Index("ix_voice_customer_documents_kind", "kind"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="other", server_default="other")
    title: Mapped[Optional[str]] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DocumentReviewStatus.pending, server_default=DocumentReviewStatus.pending
    )
    storage_key: Mapped[Optional[str]] = mapped_column(String(1000))
    url: Mapped[Optional[str]] = mapped_column(String(1000))
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    extracted_fields: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    synced_to_crm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )


# ───────────────── Compliance: Do-Not-Call / suppression list ─────────────────

class SuppressionReason:
    """Why a number must not be dialled."""

    dnd = "dnd"                # registered on a Do-Not-Disturb / DNC registry
    opt_out = "opt_out"        # caller asked to stop being contacted
    complaint = "complaint"    # raised a complaint
    bounce = "bounce"          # invalid / unreachable number
    manual = "manual"          # added by an operator
    ALL = {dnd, opt_out, complaint, bounce, manual}


class SuppressionSource:
    """Where the suppression entry originated."""

    manual = "manual"          # operator added in the UI
    import_ = "import"         # bulk CSV/list import
    call = "call"              # auto-captured during a call (caller opted out)
    api = "api"                # added via API / webhook
    ALL = {manual, import_, call, api}


class SuppressionEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An org-scoped Do-Not-Call / suppression record.

    The outbound dialer checks this list before placing a call so a number
    that opted out (or is on a DND registry) is never contacted again. The
    phone number is stored normalised (digits + leading ``+``) so look-ups are
    format-agnostic.
    """

    __tablename__ = "voice_suppression_entries"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "phone_number",
            name="uq_voice_suppression_org_phone",
        ),
        Index("ix_voice_suppression_organization_id", "organization_id"),
        Index("ix_voice_suppression_phone_number", "phone_number"),
        Index("ix_voice_suppression_reason", "reason"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SuppressionReason.manual,
        server_default=SuppressionReason.manual,
    )
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SuppressionSource.manual,
        server_default=SuppressionSource.manual,
    )
    note: Mapped[Optional[str]] = mapped_column(Text)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default="{}"
    )
