"""AI Receptionist appointment & voicemail engines (Phase 2).

Pure, side-effect-free business logic used by the receptionist call flow and
the REST API:

* :class:`AppointmentEngine` — validate a requested slot (must be a real future
  time inside working hours), check availability against already-booked slots
  and suggest the next free alternatives (TC-019..022, TC-020 alternatives).
* :class:`VoicemailService`  — decide whether a captured voicemail is keepable
  (drop empty/near-silent ones, accept long ones — TC-030..032).

Both degrade gracefully and never raise on bad input so a live call is never
broken by a malformed request.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, time as dtime, timezone as dt_timezone
from typing import Any, Iterable, Optional

from app.services.voice.receptionist import _parse_hhmm, _safe_zone, _DAY_KEYS


# ─────────────────────────────── appointments ───────────────────────────────

@dataclass
class SlotDecision:
    ok: bool
    reason: str = ""
    code: str = ""                       # invalid_time|invalid_date|past|out_of_hours|unavailable|ok
    normalized_at: Optional[datetime] = None
    alternatives: list[str] = field(default_factory=list)


def _coerce_dt(value: Any, zone) -> Optional[datetime]:
    """Best-effort parse of an ISO-ish datetime into a tz-aware datetime.

    Returns ``None`` when the value is not a valid calendar datetime (e.g. the
    "27 PM" / "yesterday" cases are handled upstream once parsed, but a value
    like ``2026-13-40`` simply fails here → invalid_time).
    """
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        raw = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            return None
    else:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=zone)
    return dt


class AppointmentEngine:
    """Validate + place appointments against a profile's settings."""

    DEFAULT_SLOT_MINUTES = 30
    DEFAULT_LEAD_MINUTES = 30
    DEFAULT_HORIZON_DAYS = 60
    DEFAULT_MAX_PER_SLOT = 1

    def _windows_for(self, settings: dict, day_key: str) -> list:
        wh = settings.get("working_hours") or settings.get("business_hours") or {}
        windows = wh.get(day_key)
        if windows is None and not wh:
            # No schedule configured → default Mon–Sat 09:00–18:00.
            if day_key == "sun":
                return []
            return [["09:00", "18:00"]]
        return windows or []

    def _in_hours(self, settings: dict, dt: datetime) -> bool:
        windows = self._windows_for(settings, _DAY_KEYS[dt.weekday()])
        t = dt.time()
        for w in windows:
            if not isinstance(w, (list, tuple)) or len(w) < 2:
                continue
            start = _parse_hhmm(str(w[0]))
            end = _parse_hhmm(str(w[1]))
            if start and end and start <= t <= end:
                return True
        return False

    def _iter_slots(self, settings: dict, *, after: datetime, zone, limit: int) -> Iterable[datetime]:
        slot_minutes = int(settings.get("slot_minutes") or self.DEFAULT_SLOT_MINUTES)
        horizon = int(settings.get("horizon_days") or self.DEFAULT_HORIZON_DAYS)
        end = after + timedelta(days=horizon)
        # Snap to the next slot boundary.
        cursor = after.replace(second=0, microsecond=0)
        minute = (cursor.minute // slot_minutes) * slot_minutes
        cursor = cursor.replace(minute=0) + timedelta(minutes=minute)
        if cursor < after:
            cursor += timedelta(minutes=slot_minutes)
        produced = 0
        guard = 0
        while cursor <= end and produced < limit and guard < 5000:
            guard += 1
            if self._in_hours(settings, cursor):
                yield cursor
                produced += 1
            cursor += timedelta(minutes=slot_minutes)

    def validate_and_check(
        self,
        requested_at: Any,
        *,
        settings: Optional[dict] = None,
        booked: Optional[list[datetime]] = None,
        timezone: str = "UTC",
        now: Optional[datetime] = None,
        suggest: int = 3,
    ) -> SlotDecision:
        settings = settings or {}
        zone = _safe_zone(timezone)
        now = (now or datetime.now(zone)).astimezone(zone)

        dt = _coerce_dt(requested_at, zone)
        if dt is None:
            return SlotDecision(False, "I didn't catch a valid time. Could you say a date and time again?", "invalid_time")
        dt = dt.astimezone(zone)

        # Past / too-soon.
        lead = int(settings.get("lead_minutes") or self.DEFAULT_LEAD_MINUTES)
        if dt <= now:
            alts = [s.isoformat() for s in self._iter_slots(settings, after=now + timedelta(minutes=lead), zone=zone, limit=suggest)]
            return SlotDecision(False, "That time is in the past. Please choose a future date and time.", "past", alternatives=alts)
        if dt < now + timedelta(minutes=lead):
            alts = [s.isoformat() for s in self._iter_slots(settings, after=now + timedelta(minutes=lead), zone=zone, limit=suggest)]
            return SlotDecision(False, f"We need at least {lead} minutes notice. Here are the next openings.", "past", alternatives=alts)

        # Out of working hours.
        if not self._in_hours(settings, dt):
            alts = [s.isoformat() for s in self._iter_slots(settings, after=dt, zone=zone, limit=suggest)]
            return SlotDecision(False, "We're not open at that time. Here are the nearest available slots.", "out_of_hours", alternatives=alts)

        # Availability against existing bookings.
        max_per = int(settings.get("max_per_slot") or self.DEFAULT_MAX_PER_SLOT)
        slot_minutes = int(settings.get("slot_minutes") or self.DEFAULT_SLOT_MINUTES)
        booked_norm = []
        for b in booked or []:
            bdt = _coerce_dt(b, zone)
            if bdt:
                booked_norm.append(bdt.astimezone(zone))
        # Count overlaps in the same slot window.
        overlap = sum(
            1 for b in booked_norm
            if abs((b - dt).total_seconds()) < slot_minutes * 60
        )
        if overlap >= max_per:
            alts = []
            for s in self._iter_slots(settings, after=dt, zone=zone, limit=suggest + len(booked_norm) + 3):
                if all(abs((b - s).total_seconds()) >= slot_minutes * 60 for b in booked_norm):
                    alts.append(s.isoformat())
                if len(alts) >= suggest:
                    break
            return SlotDecision(False, "That slot is already taken. Here are some alternatives.", "unavailable", alternatives=alts)

        return SlotDecision(True, "That time is available.", "ok", normalized_at=dt)


# ─────────────────────────────── voicemail ──────────────────────────────────

@dataclass
class VoicemailDecision:
    keep: bool
    reason: str = ""
    transcript: str = ""
    duration_seconds: int = 0


class VoicemailService:
    """Decide whether a captured voicemail should be stored (TC-030..032)."""

    MIN_DURATION_SECONDS = 1
    MIN_WORDS = 1

    def evaluate(
        self,
        *,
        transcript: Optional[str] = None,
        duration_seconds: int = 0,
    ) -> VoicemailDecision:
        text = (transcript or "").strip()
        words = len(text.split())
        # Empty / near-silent → ignore (TC-031).
        if duration_seconds < self.MIN_DURATION_SECONDS and words < self.MIN_WORDS:
            return VoicemailDecision(False, "empty", text, duration_seconds)
        if not text and duration_seconds < self.MIN_DURATION_SECONDS:
            return VoicemailDecision(False, "empty", text, duration_seconds)
        # Otherwise keep — including long voicemails (TC-032).
        return VoicemailDecision(True, "stored", text, duration_seconds)


# Process-wide singletons.
appointment_engine = AppointmentEngine()
voicemail_service = VoicemailService()
