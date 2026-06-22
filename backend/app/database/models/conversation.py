"""Conversation — one customer↔agent thread across any channel."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.database.models.agent import Agent
    from app.database.models.message import Message


class ConversationChannel(str, enum.Enum):
    voice = "voice"
    chat = "chat"
    whatsapp = "whatsapp"


class ConversationStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    qualified = "qualified"
    failed = "failed"
    lost = "lost"


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_organization_id", "organization_id"),
        Index("ix_conversations_agent_id", "agent_id"),
        Index("ix_conversations_status", "status"),
        Index("ix_conversations_started_at", "started_at"),
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

    channel: Mapped[ConversationChannel] = mapped_column(
        Enum(ConversationChannel, name="conversation_channel"), nullable=False
    )
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus, name="conversation_status"),
        nullable=False,
        default=ConversationStatus.active,
    )

    # Customer identity (denormalised — a `contacts` table can come later)
    customer_name: Mapped[Optional[str]] = mapped_column(String(160))
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(40))

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column()

    summary: Mapped[Optional[str]] = mapped_column(String(2000))
    recording_url: Mapped[Optional[str]] = mapped_column(String(500))
    transcript_url: Mapped[Optional[str]] = mapped_column(String(500))

    extra: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )

    # Relationships
    agent: Mapped["Agent"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Conversation {self.id} {self.channel} {self.status}>"
