"""AI Receptionist engine (Phase 2).

Pure business logic that sits on top of a :class:`ReceptionistProfile` and the
existing Product 1 AI runtime. Three responsibilities:

* :class:`GreetingEngine`  — context-aware greeting (business hours, holidays,
  weekends, time of day, language, returning/VIP caller).
* :class:`IntentClassifier` — classify a caller utterance into a fixed set of
  intents with a confidence score + safe fallback.
* :class:`CallRouter`       — map an intent (+ context) to a routing decision
  using the profile's ``routing_rules``.

None of this duplicates the AI — intent classification reuses the same
provider abstraction used for chat. Everything degrades gracefully so a
mis-configured profile can never break a live call.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, time as dtime, timezone as dt_timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.providers import ChatMessage, DEFAULT_MODEL, get_provider

log = logging.getLogger("app.voice.receptionist")


# ─────────────────────────────── intents ────────────────────────────────────

class Intent:
    BOOK_APPOINTMENT = "book_appointment"
    CANCEL_APPOINTMENT = "cancel_appointment"
    RESCHEDULE = "reschedule_appointment"
    SALES = "sales"
    SUPPORT = "support"
    EMERGENCY = "emergency"
    BILLING = "billing"
    COMPLAINT = "complaint"
    HUMAN = "human"
    DIRECTIONS = "directions"
    BUSINESS_HOURS = "business_hours"
    FAQ = "faq"
    OPERATOR = "operator"
    OTHER = "other"


ALL_INTENTS = [
    Intent.BOOK_APPOINTMENT, Intent.CANCEL_APPOINTMENT, Intent.RESCHEDULE,
    Intent.SALES, Intent.SUPPORT, Intent.EMERGENCY, Intent.BILLING,
    Intent.COMPLAINT, Intent.HUMAN, Intent.DIRECTIONS, Intent.BUSINESS_HOURS,
    Intent.FAQ, Intent.OPERATOR, Intent.OTHER,
]

# Lightweight keyword priors — used to bias / fall back when the model is
# unavailable or low-confidence. Order matters: emergencies first.
_INTENT_KEYWORDS: list[tuple[str, list[str]]] = [
    (Intent.EMERGENCY, ["emergency", "urgent", "right now", "bleeding", "accident", "pain", "911"]),
    (Intent.HUMAN, ["human", "real person", "agent", "representative", "someone", "talk to a person", "operator"]),
    (Intent.CANCEL_APPOINTMENT, ["cancel", "cancellation"]),
    (Intent.RESCHEDULE, ["reschedule", "move my appointment", "change my appointment"]),
    (Intent.BOOK_APPOINTMENT, ["appointment", "book", "schedule", "booking", "slot", "availability"]),
    (Intent.BILLING, ["bill", "invoice", "payment", "charge", "refund", "pay"]),
    (Intent.COMPLAINT, ["complaint", "complain", "unhappy", "disappointed", "terrible", "worst"]),
    (Intent.SALES, ["price", "pricing", "quote", "buy", "purchase", "plan", "cost", "interested in"]),
    (Intent.SUPPORT, ["help", "issue", "problem", "not working", "broken", "support", "fix"]),
    (Intent.DIRECTIONS, ["where", "located", "address", "directions", "how do i get", "parking"]),
    (Intent.BUSINESS_HOURS, ["open", "closing", "hours", "when are you", "what time"]),
]

_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


# ─────────────────────────── business-hours logic ───────────────────────────

@dataclass
class HoursStatus:
    is_open: bool
    is_holiday: bool
    holiday_name: Optional[str]
    local_now: datetime
    next_open_label: Optional[str] = None


def _safe_zone(tz: str):
    """Resolve a timezone, degrading to UTC if tzdata/the key is unavailable.

    On systems without the IANA tz database (e.g. bare Windows without the
    ``tzdata`` package) ``ZoneInfo`` raises even for ``"UTC"`` — fall back to
    the fixed-offset UTC so call handling never breaks.
    """
    for key in (tz or "UTC", "UTC"):
        try:
            return ZoneInfo(key)
        except (ZoneInfoNotFoundError, ValueError, KeyError):
            continue
    return dt_timezone.utc


def _parse_hhmm(value: str) -> Optional[dtime]:
    try:
        h, m = value.strip().split(":")[:2]
        return dtime(hour=int(h), minute=int(m))
    except Exception:  # noqa: BLE001
        return None


def evaluate_hours(
    business_hours: dict[str, Any] | None,
    holidays: list | None,
    timezone: str,
    *,
    now: Optional[datetime] = None,
) -> HoursStatus:
    """Decide whether the business is currently open.

    ``business_hours`` shape (all optional)::

        {"mon": [["09:00", "17:00"]], "sat": [], ...}

    A missing/empty day means closed. ``holidays`` may contain either
    ``{"date": "2026-01-01", "name": "New Year"}`` (specific) or
    ``{"date": "01-01", "name": "New Year"}`` (recurring MM-DD).
    """
    zone = _safe_zone(timezone)
    local_now = (now or datetime.now(zone)).astimezone(zone)

    # Holiday check.
    iso = local_now.strftime("%Y-%m-%d")
    mmdd = local_now.strftime("%m-%d")
    for h in holidays or []:
        d = (h.get("date") if isinstance(h, dict) else str(h)) or ""
        if d in (iso, mmdd):
            name = h.get("name") if isinstance(h, dict) else None
            return HoursStatus(False, True, name, local_now)

    # If no schedule configured at all, treat as always-open (best effort).
    if not business_hours:
        return HoursStatus(True, False, None, local_now)

    day_key = _DAY_KEYS[local_now.weekday()]
    windows = business_hours.get(day_key) or []
    now_t = local_now.time()
    for w in windows:
        if not isinstance(w, (list, tuple)) or len(w) < 2:
            continue
        start = _parse_hhmm(str(w[0]))
        end = _parse_hhmm(str(w[1]))
        if start and end and start <= now_t <= end:
            return HoursStatus(True, False, None, local_now)
    return HoursStatus(False, False, None, local_now)


# ─────────────────────────────── greeting ───────────────────────────────────

def _day_part(local_now: datetime) -> str:
    h = local_now.hour
    if h < 12:
        return "morning"
    if h < 17:
        return "afternoon"
    return "evening"


class GreetingEngine:
    """Produce a context-aware spoken greeting for an inbound call."""

    def build(
        self,
        profile: Any,
        *,
        hours: Optional[HoursStatus] = None,
        caller_name: Optional[str] = None,
        is_returning: bool = False,
        is_vip: bool = False,
    ) -> tuple[str, bool]:
        """Return ``(greeting_text, after_hours)``."""
        business = (getattr(profile, "business_name", "") or "").strip()
        if hours is None:
            hours = evaluate_hours(
                getattr(profile, "business_hours", {}) or {},
                getattr(profile, "holidays", []) or [],
                getattr(profile, "timezone", "UTC") or "UTC",
            )

        # Holiday takes precedence.
        if hours.is_holiday:
            name = hours.holiday_name or "the holidays"
            base = getattr(profile, "after_hours_message", None)
            msg = (
                f"Happy {name}! " if hours.holiday_name else ""
            ) + (
                base or f"Thank you for calling {business or 'us'}. "
                f"Our office is closed today. Would you like to leave a message or schedule a callback?"
            )
            return msg.strip(), True

        # After hours.
        if not hours.is_open:
            base = getattr(profile, "after_hours_message", None)
            msg = base or (
                f"Thank you for calling {business or 'us'}. Our office is currently closed. "
                "Would you like to leave a message or schedule a callback?"
            )
            return msg.strip(), True

        # Open: use a configured greeting verbatim if present.
        configured = (getattr(profile, "greeting", None) or "").strip()
        if configured:
            return configured, False

        # Otherwise synthesise a time-of-day greeting.
        part = _day_part(hours.local_now)
        who = f", {caller_name}" if caller_name else ""
        prefix = "Welcome back" if (is_returning and not is_vip) else "Good " + part
        if is_vip:
            prefix = "Good " + part
            who = f", {caller_name}" if caller_name else ""
        name_clause = f" to {business}" if business else ""
        tail = " How may I help you today?"
        if is_vip:
            tail = " It's a pleasure to hear from you. How may I help you today?"
        return f"{prefix}{who}. Welcome{name_clause}.{tail}".replace("Welcome to", "Welcome to").strip(), False


# ─────────────────────────── intent classification ──────────────────────────

@dataclass
class IntentResult:
    intent: str
    confidence: float
    reasoning: str = ""
    language: Optional[str] = None
    entities: dict[str, Any] = field(default_factory=dict)


def _keyword_intent(text: str) -> tuple[Optional[str], float]:
    low = text.lower()
    for intent, words in _INTENT_KEYWORDS:
        for w in words:
            if w in low:
                return intent, 0.55
    return None, 0.0


_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


class IntentClassifier:
    """Classify caller utterances into a fixed intent taxonomy."""

    def __init__(self, *, model: Optional[str] = None) -> None:
        self._model = model or DEFAULT_MODEL

    async def classify(
        self,
        text: str,
        *,
        history: Optional[list[dict]] = None,
        confidence_floor: float = 0.45,
    ) -> IntentResult:
        text = (text or "").strip()
        if not text:
            return IntentResult(Intent.OTHER, 0.0, "empty")

        kw_intent, kw_conf = _keyword_intent(text)

        try:
            result = await self._classify_llm(text, history)
        except Exception as e:  # noqa: BLE001 — never break the call
            log.warning("intent LLM classify failed: %s", e)
            result = None

        if result is None:
            # Pure keyword fallback.
            return IntentResult(kw_intent or Intent.FAQ, kw_conf or 0.4, "keyword-fallback")

        # Blend: if model is unsure but keywords agree, lift confidence.
        if kw_intent and kw_intent == result.intent:
            result.confidence = max(result.confidence, 0.7)
        if result.confidence < confidence_floor and kw_intent:
            result.intent = kw_intent
            result.confidence = max(result.confidence, kw_conf)
            result.reasoning += " (keyword-corrected)"
        if result.confidence < confidence_floor and not kw_intent:
            # Low confidence + no keyword signal → treat as FAQ (answerable via RAG).
            result.reasoning += " (low-confidence→faq)"
            result.intent = Intent.FAQ
        return result

    async def _classify_llm(self, text: str, history: Optional[list[dict]]) -> Optional[IntentResult]:
        provider = get_provider()
        hist_lines = ""
        if history:
            for turn in history[-6:]:
                spk = turn.get("speaker", "caller")
                t = (turn.get("text") or "").strip()
                if t:
                    hist_lines += f"{spk}: {t}\n"
        sys = (
            "You are an intent classifier for a phone receptionist. "
            "Classify the caller's latest message into exactly one intent from this list: "
            + ", ".join(ALL_INTENTS) + ". "
            "Also detect the spoken language as an ISO-639-1 code. "
            "Respond ONLY with compact JSON: "
            '{"intent": <one of the list>, "confidence": <0..1>, '
            '"language": <iso code>, "reasoning": <short>, "entities": {}}.'
        )
        user = (f"Conversation so far:\n{hist_lines}\n" if hist_lines else "") + f"Caller: {text}"
        resp = await provider.chat(
            [ChatMessage(role="system", content=sys), ChatMessage(role="user", content=user)],
            model=self._model,
            temperature=0.0,
            max_tokens=120,
        )
        raw = (resp.content or "").strip()
        m = _JSON_RE.search(raw)
        if not m:
            return None
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
        intent = str(data.get("intent", "")).strip().lower()
        if intent not in ALL_INTENTS:
            intent = Intent.FAQ
        try:
            conf = float(data.get("confidence", 0.5))
        except (TypeError, ValueError):
            conf = 0.5
        conf = max(0.0, min(1.0, conf))
        return IntentResult(
            intent=intent,
            confidence=conf,
            reasoning=str(data.get("reasoning", ""))[:200],
            language=(str(data.get("language")).lower()[:5] if data.get("language") else None),
            entities=data.get("entities") if isinstance(data.get("entities"), dict) else {},
        )


# ─────────────────────────────── routing ────────────────────────────────────

@dataclass
class RouteDecision:
    action: str            # "ai" | "transfer" | "voicemail" | "queue"
    target: Optional[str] = None     # phone number / queue id / department
    department: Optional[str] = None
    reason: str = ""
    priority: str = "normal"         # normal | high | emergency


# Default intent → action map when no explicit rule matches.
_DEFAULT_ROUTES = {
    Intent.EMERGENCY: ("transfer", "emergency"),
    Intent.HUMAN: ("transfer", "operator"),
    Intent.OPERATOR: ("transfer", "operator"),
    Intent.SALES: ("queue", "sales"),
    Intent.SUPPORT: ("queue", "support"),
    Intent.BILLING: ("queue", "finance"),
    Intent.COMPLAINT: ("queue", "support"),
}


class CallRouter:
    """Map an intent + context onto a routing decision."""

    def route(
        self,
        profile: Any,
        intent: str,
        *,
        language: Optional[str] = None,
        is_open: bool = True,
        is_vip: bool = False,
    ) -> RouteDecision:
        rules = getattr(profile, "routing_rules", []) or []
        for rule in rules:
            if not isinstance(rule, dict):
                continue
            cond = rule.get("when") or {}
            if cond.get("intent") and cond["intent"] != intent:
                continue
            if cond.get("language") and language and cond["language"] != language:
                continue
            if cond.get("vip") is not None and bool(cond["vip"]) != is_vip:
                continue
            if cond.get("business_hours") is not None and bool(cond["business_hours"]) != is_open:
                continue
            return RouteDecision(
                action=rule.get("action", "transfer"),
                target=rule.get("target"),
                department=rule.get("department") or cond.get("intent"),
                reason=f"matched rule {rule.get('name', cond.get('intent', intent))}",
                priority=rule.get("priority", "emergency" if intent == Intent.EMERGENCY else "normal"),
            )

        # Closed → voicemail unless it's an emergency.
        if not is_open and intent != Intent.EMERGENCY:
            return RouteDecision("voicemail", None, None, "after-hours", "normal")

        action, dept = _DEFAULT_ROUTES.get(intent, ("ai", None))
        priority = "emergency" if intent == Intent.EMERGENCY else ("high" if is_vip else "normal")
        return RouteDecision(action=action, target=dept, department=dept,
                             reason=f"default route for {intent}", priority=priority)


# Singletons (stateless — safe to share).
greeting_engine = GreetingEngine()
intent_classifier = IntentClassifier()
call_router = CallRouter()
