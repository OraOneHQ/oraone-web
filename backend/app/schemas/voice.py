"""Voice platform request/response schemas (Product 2)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────── channels ────────────────────────────────────

class AgentChannelUpsert(BaseModel):
    channel: str = Field(default="voice", max_length=20)
    enabled: bool = True
    status: Optional[str] = Field(default=None, max_length=20)
    phone_number: Optional[str] = Field(default=None, max_length=32)
    provider: Optional[str] = Field(default=None, max_length=40)
    configuration: Optional[dict[str, Any]] = None


class AgentChannelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    channel: str
    enabled: bool
    status: str
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


# ──────────────────────────── voice profiles ─────────────────────────────────

class VoiceProfileUpsert(BaseModel):
    provider: Optional[str] = Field(default=None, max_length=40)
    voice_id: Optional[str] = Field(default=None, max_length=120)
    model: Optional[str] = Field(default=None, max_length=80)
    language: Optional[str] = Field(default=None, max_length=16)
    sample_rate: Optional[int] = Field(default=None, ge=8000, le=48000)
    speed: Optional[float] = Field(default=None, ge=0.5, le=2.0)
    stability: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    similarity_boost: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    style: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    stt_provider: Optional[str] = Field(default=None, max_length=40)
    stt_model: Optional[str] = Field(default=None, max_length=80)
    enabled: Optional[bool] = None
    configuration: Optional[dict[str, Any]] = None


class VoiceProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    provider: str
    voice_id: str
    model: str
    language: str
    sample_rate: int
    speed: float
    stability: float
    similarity_boost: float
    style: float
    stt_provider: str
    stt_model: str
    enabled: bool
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


# ──────────────────────────────── calls ──────────────────────────────────────

class VoiceCallRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    agent_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    campaign_id: Optional[uuid.UUID] = None
    provider: str
    provider_call_sid: Optional[str] = None
    direction: str
    status: str
    caller_number: Optional[str] = None
    receiver_number: Optional[str] = None
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int
    end_reason: Optional[str] = None
    detected_intent: Optional[str] = None
    detected_language: Optional[str] = None
    sentiment: Optional[str] = None
    resolution: Optional[str] = None
    summary: Optional[str] = None
    cost: float
    avg_latency_ms: float
    interruptions: int
    tokens: int
    recording_url: Optional[str] = None
    transcript_status: str
    created_at: datetime


class VoiceCallListResponse(BaseModel):
    items: list[VoiceCallRead]
    total: int
    limit: int
    offset: int


class VoiceMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    call_id: uuid.UUID
    sequence: int
    speaker: str
    text: str
    start_time: float
    end_time: float
    confidence: float
    is_final: bool
    latency_ms: Optional[float] = None
    language: Optional[str] = None
    created_at: datetime


class VoiceRecordingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    call_id: uuid.UUID
    provider: str
    kind: str
    storage_key: Optional[str] = None
    url: Optional[str] = None
    duration_seconds: int
    size_bytes: int
    format: str
    transcript: Optional[str] = None
    created_at: datetime


class VoiceCallDetail(VoiceCallRead):
    messages: list[VoiceMessageRead] = Field(default_factory=list)
    recordings: list[VoiceRecordingRead] = Field(default_factory=list)


# ───────────────────────── outbound / actions ────────────────────────────────

class OutboundCallRequest(BaseModel):
    agent_id: uuid.UUID
    to_number: str = Field(..., max_length=32)
    from_number: Optional[str] = Field(default=None, max_length=32)
    metadata: Optional[dict[str, Any]] = None


class CallActionResponse(BaseModel):
    call_id: uuid.UUID
    status: str
    provider: str
    provider_call_sid: Optional[str] = None
    message: Optional[str] = None


# ──────────────────────────── sessions ───────────────────────────────────────

class VoiceSessionRead(BaseModel):
    id: str
    call_id: str
    agent_id: Optional[str] = None
    state: str
    direction: str
    caller_number: Optional[str] = None
    language: Optional[str] = None
    duration_seconds: int
    avg_latency_ms: float
    tokens: int
    turns: int


# ──────────────────────────── dashboard ──────────────────────────────────────

class VoiceDashboard(BaseModel):
    calls_today: int
    live_calls: int
    completed: int
    failed: int
    avg_duration_seconds: float
    total_cost: float
    avg_latency_ms: float
    ai_resolution_rate: float
    human_transfer_rate: float
    recent_calls: list[VoiceCallRead] = Field(default_factory=list)


# ─────────────────────────── receptionist (Phase 2) ──────────────────────────

class ReceptionistProfileUpsert(BaseModel):
    enabled: Optional[bool] = None
    business_name: Optional[str] = Field(default=None, max_length=200)
    greeting: Optional[str] = None
    after_hours_message: Optional[str] = None
    voicemail_prompt: Optional[str] = None
    timezone: Optional[str] = Field(default=None, max_length=64)
    default_language: Optional[str] = Field(default=None, max_length=16)
    languages: Optional[list[str]] = None
    allow_recording: Optional[bool] = None
    allow_voicemail: Optional[bool] = None
    business_hours: Optional[dict[str, Any]] = None
    holidays: Optional[list[Any]] = None
    routing_rules: Optional[list[Any]] = None
    appointment_settings: Optional[dict[str, Any]] = None
    configuration: Optional[dict[str, Any]] = None


class ReceptionistProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    enabled: bool
    business_name: str
    greeting: Optional[str] = None
    after_hours_message: Optional[str] = None
    voicemail_prompt: Optional[str] = None
    timezone: str
    default_language: str
    languages: list[Any] = Field(default_factory=list)
    allow_recording: bool
    allow_voicemail: bool
    business_hours: dict[str, Any] = Field(default_factory=dict)
    holidays: list[Any] = Field(default_factory=list)
    routing_rules: list[Any] = Field(default_factory=list)
    appointment_settings: dict[str, Any] = Field(default_factory=dict)
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


# ─────────────────────────── human handoff (Phase 5) ─────────────────────────

class TransferRequest(BaseModel):
    transfer_type: str = Field(default="warm", pattern="^(warm|cold)$")
    target_number: Optional[str] = Field(default=None, max_length=32)
    department: Optional[str] = Field(default=None, max_length=80)
    queue: Optional[str] = Field(default=None, max_length=80)
    reason: Optional[str] = Field(default=None, max_length=200)
    context_summary: Optional[str] = None


class CallTransferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    call_id: uuid.UUID
    transfer_type: str
    reason: Optional[str] = None
    department: Optional[str] = None
    queue: Optional[str] = None
    target_number: Optional[str] = None
    status: str
    requested_at: Optional[datetime] = None
    connected_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    wait_seconds: int = 0
    context_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─────────────────────────── outbound campaigns (Phase 8) ────────────────────

class CampaignCreate(BaseModel):
    agent_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    goal: Optional[str] = Field(default=None, max_length=40)
    from_number: Optional[str] = Field(default=None, max_length=32)
    script: Optional[str] = None
    max_attempts: int = Field(default=3, ge=1, le=10)
    concurrency: int = Field(default=1, ge=1, le=50)
    scheduled_at: Optional[datetime] = None
    configuration: Optional[dict[str, Any]] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    goal: Optional[str] = Field(default=None, max_length=40)
    from_number: Optional[str] = Field(default=None, max_length=32)
    script: Optional[str] = None
    max_attempts: Optional[int] = Field(default=None, ge=1, le=10)
    concurrency: Optional[int] = Field(default=None, ge=1, le=50)
    scheduled_at: Optional[datetime] = None
    configuration: Optional[dict[str, Any]] = None


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    status: str
    from_number: Optional[str] = None
    script: Optional[str] = None
    max_attempts: int
    concurrency: int
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    total_contacts: int
    completed_contacts: int
    failed_contacts: int
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class CampaignContactIn(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    phone_number: str = Field(min_length=3, max_length=32)
    variables: Optional[dict[str, Any]] = None


class CampaignContactsAdd(BaseModel):
    contacts: list[CampaignContactIn] = Field(min_length=1)


class CampaignContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    campaign_id: uuid.UUID
    name: Optional[str] = None
    phone_number: str
    status: str
    attempts: int
    last_call_id: Optional[uuid.UUID] = None
    last_attempt_at: Optional[datetime] = None
    outcome: Optional[str] = None
    variables: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class CampaignContactListResponse(BaseModel):
    items: list[CampaignContactRead] = Field(default_factory=list)
    total: int = 0


class CampaignListResponse(BaseModel):
    items: list[CampaignRead] = Field(default_factory=list)
    total: int = 0


# ─────────────────────────────── sales (Phase 3) ─────────────────────────────

class SalesProfileUpsert(BaseModel):
    enabled: Optional[bool] = None
    qualification_strategy: Optional[str] = Field(default=None, max_length=40)
    default_pipeline: Optional[str] = Field(default=None, max_length=120)
    crm_provider: Optional[str] = Field(default=None, max_length=40)
    calendar_provider: Optional[str] = Field(default=None, max_length=40)
    allow_quote_generation: Optional[bool] = None
    follow_up_enabled: Optional[bool] = None
    qualification_questions: Optional[list[Any]] = None
    products: Optional[list[Any]] = None
    pricing_rules: Optional[dict[str, Any]] = None
    configuration: Optional[dict[str, Any]] = None


class SalesProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    enabled: bool
    qualification_strategy: str
    default_pipeline: Optional[str] = None
    crm_provider: Optional[str] = None
    calendar_provider: Optional[str] = None
    allow_quote_generation: bool
    follow_up_enabled: bool
    qualification_questions: list[Any] = Field(default_factory=list)
    products: list[Any] = Field(default_factory=list)
    pricing_rules: dict[str, Any] = Field(default_factory=dict)
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class QualifyRequest(BaseModel):
    text: str = Field(default="", max_length=8000)
    answers: Optional[dict[str, Any]] = None


class RecommendRequest(BaseModel):
    need: str = Field(default="", max_length=2000)
    top_k: int = Field(default=3, ge=1, le=10)


class QuoteRequest(BaseModel):
    product_name: Optional[str] = Field(default=None, max_length=200)
    product: Optional[dict[str, Any]] = None
    quantity: int = Field(default=1, ge=1, le=100000)


# ────────────────────────────── support (Phase 4) ────────────────────────────

class SupportProfileUpsert(BaseModel):
    enabled: Optional[bool] = None
    create_tickets: Optional[bool] = None
    ticketing_provider: Optional[str] = Field(default=None, max_length=40)
    escalation_rules: Optional[list[Any]] = None
    sla_minutes: Optional[int] = Field(default=None, ge=0, le=100000)
    knowledge_base_ids: Optional[list[Any]] = None
    configuration: Optional[dict[str, Any]] = None


class SupportProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    enabled: bool
    create_tickets: bool
    ticketing_provider: Optional[str] = None
    escalation_rules: list[Any] = Field(default_factory=list)
    sla_minutes: int
    knowledge_base_ids: list[Any] = Field(default_factory=list)
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class EscalationCheckRequest(BaseModel):
    text: str = Field(default="", max_length=8000)
    sentiment: Optional[str] = None
    intent: Optional[str] = None
    repeat_count: int = Field(default=0, ge=0, le=100)


class SummarizeRequest(BaseModel):
    text: str = Field(default="", max_length=8000)
    resolved: Optional[bool] = None
    category: Optional[str] = None


class TicketCreate(BaseModel):
    call_id: Optional[uuid.UUID] = None
    text: Optional[str] = Field(default=None, max_length=8000)
    subject: Optional[str] = Field(default=None, max_length=300)
    body: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=80)
    priority: Optional[str] = Field(default=None, pattern="^(low|normal|high|urgent)$")
    customer_name: Optional[str] = Field(default=None, max_length=200)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    customer_email: Optional[str] = Field(default=None, max_length=254)


class TicketUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(open|pending|escalated|resolved|closed)$")
    priority: Optional[str] = Field(default=None, pattern="^(low|normal|high|urgent)$")
    resolution: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=80)


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    subject: str
    body: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    resolution: Optional[str] = None
    escalated: bool
    sla_due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    external_provider: Optional[str] = None
    external_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TicketListResponse(BaseModel):
    items: list[TicketRead] = Field(default_factory=list)
    total: int = 0


# ──────────────────────── voice workflow triggers (Phase 6) ──────────────────

_TRIGGER_TYPES = "^(intent|keyword|phrase|sentiment|call_started|call_ended)$"


class WorkflowTriggerCreate(BaseModel):
    workflow_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    name: str = Field(min_length=1, max_length=200)
    enabled: bool = True
    trigger_type: str = Field(default="intent", pattern=_TRIGGER_TYPES)
    match_values: list[str] = Field(default_factory=list)
    priority: int = Field(default=100, ge=0, le=10000)
    once_per_call: bool = True
    configuration: Optional[dict[str, Any]] = None


class WorkflowTriggerUpdate(BaseModel):
    workflow_id: Optional[uuid.UUID] = None
    agent_id: Optional[uuid.UUID] = None
    name: Optional[str] = Field(default=None, max_length=200)
    enabled: Optional[bool] = None
    trigger_type: Optional[str] = Field(default=None, pattern=_TRIGGER_TYPES)
    match_values: Optional[list[str]] = None
    priority: Optional[int] = Field(default=None, ge=0, le=10000)
    once_per_call: Optional[bool] = None
    configuration: Optional[dict[str, Any]] = None


class WorkflowTriggerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    name: str
    enabled: bool
    trigger_type: str
    match_values: list[Any] = Field(default_factory=list)
    priority: int
    once_per_call: bool
    fire_count: int
    last_fired_at: Optional[datetime] = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class WorkflowTriggerListResponse(BaseModel):
    items: list[WorkflowTriggerRead] = Field(default_factory=list)
    total: int = 0


class TriggerTestRequest(BaseModel):
    signal_type: str = Field(default="intent", pattern=_TRIGGER_TYPES)
    value: Optional[str] = None
    text: str = Field(default="", max_length=8000)
    agent_id: Optional[uuid.UUID] = None


class TriggerFireRequest(BaseModel):
    signal_type: str = Field(default="intent", pattern=_TRIGGER_TYPES)
    value: Optional[str] = None
    text: str = Field(default="", max_length=8000)
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    context: Optional[dict[str, Any]] = None


# ─────────────────────────── Phase 9: enterprise voice ───────────────────────

# 9.4 Translation
class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    target_language: str = Field(min_length=2, max_length=16)
    source_language: Optional[str] = Field(default=None, max_length=16)
    formality: str = Field(default="neutral", max_length=12)


class TranslateResponse(BaseModel):
    text: str
    source_language: str
    target_language: str
    translated: bool
    provider: str = "ai"
    confidence: float = 1.0


# 9.3 Voice library / governance
_VOICE_KINDS = r"^(custom|cloned|stock)$"


class VoiceLibraryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=4000)
    provider: str = Field(default="elevenlabs", max_length=40)
    provider_voice_id: Optional[str] = Field(default=None, max_length=120)
    kind: str = Field(default="custom", pattern=_VOICE_KINDS)
    language: str = Field(default="en", max_length=16)
    gender: Optional[str] = Field(default=None, max_length=20)
    accent: Optional[str] = Field(default=None, max_length=40)
    style_profile: Optional[str] = Field(default=None, max_length=40)
    consent_obtained: bool = False
    metadata: Optional[dict[str, Any]] = None


class VoiceLibraryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=4000)
    provider_voice_id: Optional[str] = Field(default=None, max_length=120)
    language: Optional[str] = Field(default=None, max_length=16)
    gender: Optional[str] = Field(default=None, max_length=20)
    accent: Optional[str] = Field(default=None, max_length=40)
    style_profile: Optional[str] = Field(default=None, max_length=40)
    consent_obtained: Optional[bool] = None
    metadata: Optional[dict[str, Any]] = None


class VoiceLibraryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    provider: str
    provider_voice_id: Optional[str] = None
    kind: str
    language: str
    gender: Optional[str] = None
    accent: Optional[str] = None
    style_profile: Optional[str] = None
    version: int
    status: str
    consent_obtained: bool
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class VoiceLibraryListResponse(BaseModel):
    items: list[VoiceLibraryRead] = Field(default_factory=list)
    total: int = 0


# 9.5 Advanced recording metadata
class RecordingUpdate(BaseModel):
    consent: Optional[bool] = None
    tags: Optional[list[str]] = None
    retention_days: Optional[int] = Field(default=None, ge=0, le=36500)
    redacted: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=4000)


class RecordingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    call_id: uuid.UUID
    provider: str
    kind: str
    storage_key: Optional[str] = None
    url: Optional[str] = None
    duration_seconds: int
    size_bytes: int
    format: str
    transcript: Optional[str] = None
    meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class RecordingListResponse(BaseModel):
    items: list[RecordingRead] = Field(default_factory=list)
    total: int = 0


# 9.6 Supervisor operations
_SUPERVISOR_ACTIONS = r"^(listen|whisper|barge|takeover|force_transfer|end_call|monitor)$"


class SuperviseRequest(BaseModel):
    action: str = Field(pattern=_SUPERVISOR_ACTIONS)
    message: Optional[str] = Field(default=None, max_length=2000)   # for whisper/barge
    target: Optional[str] = Field(default=None, max_length=64)      # dept/number for force_transfer
    note: Optional[str] = Field(default=None, max_length=2000)


class SuperviseResponse(BaseModel):
    call_id: uuid.UUID
    action: str
    applied: bool
    state: Optional[str] = None
    detail: Optional[str] = None


class ActiveCallRead(BaseModel):
    session_id: str
    call_id: Optional[str] = None
    agent_id: Optional[str] = None
    state: str
    direction: str = "inbound"
    language: Optional[str] = None
    caller_number: Optional[str] = None
    duration_seconds: int = 0
    supervised: bool = False
    intent: Optional[str] = None


class SupervisorConsoleResponse(BaseModel):
    active_calls: list[ActiveCallRead] = Field(default_factory=list)
    total_active: int = 0
    ai_calls: int = 0
    human_calls: int = 0
    supervised: int = 0


# ───────────────────── Phase 2: appointments / voicemail / callback ──────────

class AppointmentCheckRequest(BaseModel):
    agent_id: uuid.UUID
    requested_at: str = Field(min_length=4, max_length=40)   # ISO datetime
    suggest: int = Field(default=3, ge=1, le=10)


class AppointmentCheckResponse(BaseModel):
    ok: bool
    code: str
    reason: str
    normalized_at: Optional[datetime] = None
    alternatives: list[str] = Field(default_factory=list)


class AppointmentCreate(BaseModel):
    agent_id: uuid.UUID
    requested_at: str = Field(min_length=4, max_length=40)
    customer_name: Optional[str] = Field(default=None, max_length=200)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    customer_email: Optional[str] = Field(default=None, max_length=255)
    service: Optional[str] = Field(default=None, max_length=200)
    duration_minutes: int = Field(default=30, ge=5, le=480)
    notes: Optional[str] = Field(default=None, max_length=4000)
    call_id: Optional[uuid.UUID] = None
    force: bool = False   # bypass availability (e.g. human override)


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    service: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    timezone: str
    status: str
    notes: Optional[str] = None
    canceled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    items: list[AppointmentRead] = Field(default_factory=list)
    total: int = 0


class VoicemailCapture(BaseModel):
    transcript: Optional[str] = Field(default=None, max_length=20000)
    duration_seconds: int = Field(default=0, ge=0)
    url: Optional[str] = Field(default=None, max_length=1000)
    storage_key: Optional[str] = Field(default=None, max_length=1000)


class VoicemailCaptureResponse(BaseModel):
    kept: bool
    reason: str
    recording_id: Optional[uuid.UUID] = None
    duration_seconds: int = 0


class CallbackCreate(BaseModel):
    agent_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = Field(default=None, max_length=200)
    customer_phone: Optional[str] = Field(default=None, max_length=32)
    reason: Optional[str] = Field(default=None, max_length=4000)
    preferred_time: Optional[str] = Field(default=None, max_length=40)
    call_id: Optional[uuid.UUID] = None


class CallbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    call_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    reason: Optional[str] = None
    preferred_time: Optional[datetime] = None
    status: str
    workflow_run_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


class CallbackListResponse(BaseModel):
    items: list[CallbackRead] = Field(default_factory=list)
    total: int = 0


class ConsentNoticeResponse(BaseModel):
    recording_enabled: bool
    notice: str
    language: str
