"""Lead service — scoring heuristics + capture helper.

Shared by the dashboard ``/api/leads`` router and the public widget lead
endpoint so a captured contact always produces a first-class ``leads`` row
with a sensible score/temperature.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.lead import Lead, LeadStatus, LeadTemperature


# Intent keywords that signal buying interest → boost the score.
_HOT_KEYWORDS = (
    "quote", "quotation", "pricing", "price", "buy", "purchase", "demo",
    "trial", "book", "appointment", "schedule", "contract", "invoice",
    "subscribe", "upgrade", "enterprise", "sales", "talk to",
)
_WARM_KEYWORDS = (
    "interested", "info", "information", "details", "learn", "how much",
    "compare", "feature", "support", "help",
)


def score_lead(
    *,
    email: Optional[str],
    phone: Optional[str],
    company: Optional[str],
    intent: Optional[str],
    message: Optional[str],
) -> tuple[int, LeadTemperature]:
    """Deterministic 0-100 lead score + temperature.

    Completeness of contact details + buying-intent keywords drive the score.
    """
    score = 0
    if email:
        score += 30
    if phone:
        score += 25
    if company:
        score += 15

    blob = " ".join(filter(None, [intent or "", message or ""])).lower()
    if any(k in blob for k in _HOT_KEYWORDS):
        score += 30
    elif any(k in blob for k in _WARM_KEYWORDS):
        score += 12

    score = max(0, min(100, score))

    if score >= 70:
        temp = LeadTemperature.hot
    elif score >= 40:
        temp = LeadTemperature.warm
    else:
        temp = LeadTemperature.cold
    return score, temp


async def create_lead(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
    project_id: Optional[uuid.UUID] = None,
    conversation_id: Optional[uuid.UUID] = None,
    agent_id: Optional[uuid.UUID] = None,
    widget_id: Optional[uuid.UUID] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    intent: Optional[str] = None,
    message: Optional[str] = None,
    source: str = "widget",
    status: Optional[LeadStatus] = None,
    score: Optional[int] = None,
    temperature: Optional[LeadTemperature] = None,
) -> Lead:
    """Create + flush a Lead, auto-scoring when score is not supplied."""
    if score is None or temperature is None:
        auto_score, auto_temp = score_lead(
            email=email, phone=phone, company=company, intent=intent, message=message
        )
        score = auto_score if score is None else score
        temperature = auto_temp if temperature is None else temperature

    lead = Lead(
        organization_id=organization_id,
        project_id=project_id,
        conversation_id=conversation_id,
        agent_id=agent_id,
        widget_id=widget_id,
        name=(name or None),
        email=(email or None),
        phone=(phone or None),
        company=(company or None),
        intent=(intent or None),
        message=(message or None),
        source=source,
        status=status or LeadStatus.new,
        score=score,
        temperature=temperature,
    )
    session.add(lead)
    await session.flush()
    return lead
