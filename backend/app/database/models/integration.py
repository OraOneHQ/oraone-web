"""Integration — third-party connections owned by an organization
(e.g. Twilio voice, Meta WhatsApp Business, SendGrid, Salesforce…)."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.database.models.organization import Organization


class IntegrationType(str, enum.Enum):
    voice = "voice"
    sms = "sms"
    email = "email"
    whatsapp = "whatsapp"
    crm = "crm"
    calendar = "calendar"
    storage = "storage"
    analytics = "analytics"
    other = "other"


class IntegrationStatus(str, enum.Enum):
    disconnected = "disconnected"
    connected = "connected"
    error = "error"


class Integration(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "provider", name="uq_integrations_org_provider"
        ),
        Index("ix_integrations_organization_id", "organization_id"),
        Index("ix_integrations_status", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    provider: Mapped[str] = mapped_column(String(60), nullable=False)
    type: Mapped[IntegrationType] = mapped_column(
        Enum(IntegrationType, name="integration_type"), nullable=False
    )
    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus, name="integration_status"),
        nullable=False,
        default=IntegrationStatus.disconnected,
    )

    # Single JSONB blob for everything (credentials AND non-sensitive settings).
    # TODO: add at-rest encryption layer before storing real keys.
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(String(1000))

    organization: Mapped["Organization"] = relationship(back_populates="integrations")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Integration {self.provider} ({self.status})>"
