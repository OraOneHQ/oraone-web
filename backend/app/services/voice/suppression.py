"""Do-Not-Call / suppression-list helpers (Product 2 #16 — Compliance).

The outbound dialer consults :func:`is_suppressed` before placing a call so a
number that opted out (or sits on a DND registry) is never contacted again.
Numbers are stored and compared in a normalised form (a leading ``+`` followed
by digits) so look-ups are format-agnostic (``+1 (817) 406-8649`` ==
``18174068649`` == ``+18174068649``).
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.voice import (
    SuppressionEntry,
    SuppressionReason,
    SuppressionSource,
)

_DIGITS = re.compile(r"\D+")


def normalize_phone(raw: str | None) -> str:
    """Canonicalise a phone number to ``+<digits>`` (a single, stable key).

    Every format of the same number collapses to one value so the unique
    constraint dedups correctly and look-ups are format-agnostic
    (``+1 (817) 406-8649`` == ``18174068649`` == ``+18174068649``). Returns an
    empty string for falsy / digit-less input.
    """
    if not raw:
        return ""
    digits = _DIGITS.sub("", raw)
    if not digits:
        return ""
    return "+" + digits


def _match_keys(raw: str | None) -> list[str]:
    """The canonical key a number is stored/looked-up under."""
    norm = normalize_phone(raw)
    return [norm] if norm else []


async def is_suppressed(
    db: AsyncSession, organization_id, phone_number: str | None
) -> Optional[SuppressionEntry]:
    """Return the active suppression entry for ``phone_number``, or ``None``.

    Entries with an ``expires_at`` in the past are treated as inactive.
    """
    keys = _match_keys(phone_number)
    if not keys:
        return None
    now = datetime.now(timezone.utc)
    entry = await db.scalar(
        select(SuppressionEntry)
        .where(SuppressionEntry.organization_id == organization_id)
        .where(SuppressionEntry.phone_number.in_(keys))
        .where(
            (SuppressionEntry.expires_at.is_(None))
            | (SuppressionEntry.expires_at > now)
        )
        .limit(1)
    )
    return entry


async def add_suppression(
    db: AsyncSession,
    organization_id,
    phone_number: str,
    *,
    reason: str = SuppressionReason.manual,
    source: str = SuppressionSource.manual,
    note: str | None = None,
    expires_at: datetime | None = None,
    created_by=None,
    meta: dict | None = None,
) -> Optional[SuppressionEntry]:
    """Upsert a suppression entry (idempotent on org + normalised number).

    Returns the entry, or ``None`` when the number can't be normalised.
    """
    norm = normalize_phone(phone_number)
    if not norm:
        return None
    if reason not in SuppressionReason.ALL:
        reason = SuppressionReason.manual
    if source not in SuppressionSource.ALL:
        source = SuppressionSource.manual

    stmt = (
        pg_insert(SuppressionEntry)
        .values(
            organization_id=organization_id,
            phone_number=norm,
            reason=reason,
            source=source,
            note=note,
            expires_at=expires_at,
            created_by=created_by,
            meta=meta or {},
        )
        .on_conflict_do_update(
            constraint="uq_voice_suppression_org_phone",
            set_={
                "reason": reason,
                "source": source,
                "note": note,
                "expires_at": expires_at,
                "updated_at": func.now(),
            },
        )
        .returning(SuppressionEntry.id)
    )
    await db.execute(stmt)
    return await db.scalar(
        select(SuppressionEntry)
        .where(SuppressionEntry.organization_id == organization_id)
        .where(SuppressionEntry.phone_number == norm)
    )


async def bulk_add_suppression(
    db: AsyncSession,
    organization_id,
    phone_numbers: Iterable[str],
    *,
    reason: str = SuppressionReason.manual,
    source: str = SuppressionSource.import_,
    created_by=None,
) -> int:
    """Upsert many numbers. Returns the count of valid numbers processed."""
    seen: set[str] = set()
    rows = []
    for raw in phone_numbers:
        norm = normalize_phone(raw)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        rows.append(
            {
                "organization_id": organization_id,
                "phone_number": norm,
                "reason": reason if reason in SuppressionReason.ALL else SuppressionReason.manual,
                "source": source if source in SuppressionSource.ALL else SuppressionSource.import_,
                "created_by": created_by,
                "meta": {},
            }
        )
    if not rows:
        return 0
    stmt = pg_insert(SuppressionEntry).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_voice_suppression_org_phone",
        set_={"reason": stmt.excluded.reason, "source": stmt.excluded.source, "updated_at": func.now()},
    )
    await db.execute(stmt)
    return len(rows)
