"""Tenant-scoped business API (Phase 5).

All routes here resolve their tenant from the authenticated identity via
``get_current_organization`` — never from the request body, query string,
or headers. Repositories used here MUST be the ``OrgScoped*`` variants.

Mounted under ``/api/v2`` so the legacy MongoDB-backed routes in
``server.py`` keep working until Phase 2 migrates them.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.agent import Agent  # noqa: F401 — used by OrgScopedAgentRepository in conversation create-path
from app.database.models.conversation import (
    Conversation,
    ConversationChannel,
    ConversationStatus,
)
from app.database.models.integration import (
    Integration,
    IntegrationStatus,
    IntegrationType,
)
from app.database.models.message import Message, MessageSender
from app.database.repositories.agent_repository import OrgScopedAgentRepository
from app.database.repositories.conversation_repository import (
    OrgScopedConversationRepository,
)
from app.database.repositories.integration_repository import (
    OrgScopedIntegrationRepository,
)
from app.database.repositories.message_repository import OrgScopedMessageRepository
from app.database.session import get_db
from app.middleware.org_context import (
    OrgContext,
    get_current_organization,
    require_role,
)
from app.schemas.v2 import (
    ConversationIn,
    ConversationOut,
    IntegrationIn,
    IntegrationOut,
    MessageIn,
    MessageOut,
)

router = APIRouter(prefix="/api/v2", tags=["v2"])


# ─────────────────────────── Whoami ───────────────────────────

@router.get("/me/organization")
async def whoami(ctx: OrgContext = Depends(get_current_organization)) -> dict:
    """Echo back the server-resolved org context (handy for debugging)."""
    return {
        "user_id": str(ctx.user_id),
        "organization_id": str(ctx.organization_id),
        "membership_role": ctx.membership_role,
    }


# ─────────────────────────── Agents ───────────────────────────
# Agent CRUD lives at /api/agents (Phase 6) — see app.api.agents.routes.


# ───────────────────── Conversations ─────────────────────

@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    agent_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> list[Conversation]:
    parsed_status = ConversationStatus(status_filter) if status_filter else None
    repo = OrgScopedConversationRepository(session, ctx)
    return await repo.list_filtered(
        status=parsed_status, agent_id=agent_id, limit=limit, offset=offset
    )


@router.post(
    "/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: ConversationIn,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Conversation:
    # Verify the agent belongs to the caller's org before creating the thread.
    agent_repo = OrgScopedAgentRepository(session, ctx)
    if await agent_repo.get_in_org(payload.agent_id) is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Agent not found in your organization.",
        )

    try:
        channel = ConversationChannel(payload.channel)
        conv_status = ConversationStatus(payload.status)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e

    conv = Conversation(
        agent_id=payload.agent_id,
        channel=channel,
        status=conv_status,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        started_at=payload.started_at or datetime.now(timezone.utc),
        summary=payload.summary,
        extra=payload.extra,
    )
    repo = OrgScopedConversationRepository(session, ctx)
    await repo.add_for_org(conv)
    await session.commit()
    await session.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Conversation:
    repo = OrgScopedConversationRepository(session, ctx)
    conv = await repo.get_in_org(conversation_id)
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    return conv


# ─────────────────────── Messages ───────────────────────

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(default=500, ge=1, le=1000),
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> list[Message]:
    # Pre-check the conversation belongs to the caller's org. Without this,
    # a 404 would leak existence/non-existence semantics; with it, we get
    # consistent 404 for both "doesn't exist" and "exists but not yours".
    conv_repo = OrgScopedConversationRepository(session, ctx)
    if await conv_repo.get_in_org(conversation_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")

    msg_repo = OrgScopedMessageRepository(session, ctx)
    return await msg_repo.list_in_conversation(conversation_id, limit=limit)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    conversation_id: uuid.UUID,
    payload: MessageIn,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Message:
    try:
        sender = MessageSender(payload.sender)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e

    msg = Message(
        sender=sender,
        message=payload.message,
        audio_url=payload.audio_url,
        metadata_=payload.metadata,
    )
    repo = OrgScopedMessageRepository(session, ctx)
    try:
        await repo.add_to_conversation(msg, conversation_id)
    except PermissionError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
    await session.commit()
    await session.refresh(msg)
    return msg


# ───────────────────── Integrations ─────────────────────

@router.get("/integrations", response_model=list[IntegrationOut])
async def list_integrations(
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> list[Integration]:
    repo = OrgScopedIntegrationRepository(session, ctx)
    return list(await repo.list_in_org())


@router.post(
    "/integrations",
    response_model=IntegrationOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def create_integration(
    payload: IntegrationIn,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Integration:
    try:
        itype = IntegrationType(payload.type)
        istatus = IntegrationStatus(payload.status)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e

    repo = OrgScopedIntegrationRepository(session, ctx)
    if await repo.get_by_provider(payload.provider) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Integration '{payload.provider}' already exists for this organization.",
        )

    integration = Integration(
        provider=payload.provider,
        type=itype,
        status=istatus,
        config=payload.config,
    )
    await repo.add_for_org(integration)
    await session.commit()
    await session.refresh(integration)
    return integration


@router.delete(
    "/integrations/{integration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def delete_integration(
    integration_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_organization),
    session: AsyncSession = Depends(get_db),
) -> Response:
    repo = OrgScopedIntegrationRepository(session, ctx)
    ok = await repo.soft_delete_in_org(integration_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found.")
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
