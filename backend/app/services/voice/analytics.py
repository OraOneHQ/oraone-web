"""Voice analytics capture (Phase 1.10 / Phase 7).

Thin helper that appends rows to the shared ``analytics_events`` table so
voice reuses Product 1's analytics framework. Event types are namespaced
``VOICE_*``. Aggregate dashboards are computed live from ``voice_calls``
(see the API layer); this stream captures per-turn/per-event telemetry.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.analytics import AnalyticsEvent

log = logging.getLogger("app.voice.analytics")


class VoiceEvent:
    call_started = "VOICE_CALL_STARTED"
    transcript = "VOICE_TRANSCRIPT"
    response = "VOICE_RESPONSE"
    transfer = "VOICE_TRANSFER"
    voicemail = "VOICE_VOICEMAIL"
    error = "VOICE_ERROR"
    call_ended = "VOICE_CALL_ENDED"
    intent = "VOICE_INTENT"
    supervision = "VOICE_SUPERVISION"


async def record_event(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    event_type: str,
    call_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict[str, Any]] = None,
    commit: bool = False,
) -> None:
    """Append a voice analytics event. Best-effort — never raises."""
    try:
        ev = AnalyticsEvent(
            organization_id=organization_id,
            event_type=event_type,
            entity="voice_call",
            entity_id=str(call_id) if call_id else None,
            user_id=user_id,
            event_metadata=metadata or {},
        )
        db.add(ev)
        if commit:
            await db.commit()
    except Exception as e:  # noqa: BLE001 — analytics must never break a call
        log.warning("voice analytics record failed (%s): %s", event_type, e)
