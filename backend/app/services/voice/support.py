"""AI Support engine (Phase 4).

Telephony-independent support logic:

* **Escalation evaluation** — decides whether a call should be escalated to a
  human, based on the profile's ``escalation_rules`` plus signals (sentiment,
  intent, repeat count, explicit "agent" requests, anger keywords).
* **Ticket drafting** — turns a call/transcript into a structured ticket
  (subject, body, category, priority, customer) ready to persist or forward.
* **Call summarisation** — produces a structured wrap-up (issue, resolution,
  action items, sentiment) heuristically; the live path may swap in an LLM.

All pure functions / dataclasses so they are unit-testable offline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

from app.database.models.voice import TicketPriority

# ────────────────────────────── escalation ───────────────────────────────────

_ANGER_WORDS = [
    "angry", "furious", "ridiculous", "unacceptable", "terrible", "worst",
    "lawsuit", "sue", "cancel my account", "fed up", "frustrated", "useless",
    "horrible", "scam", "never again",
]
_HUMAN_WORDS = [
    "speak to a human", "talk to a person", "real person", "agent", "representative",
    "supervisor", "manager", "someone else", "transfer me",
]
_URGENT_WORDS = ["emergency", "urgent", "down", "outage", "critical", "asap", "immediately"]


@dataclass
class EscalationDecision:
    escalate: bool
    priority: str = TicketPriority.normal
    reason: Optional[str] = None
    target_department: Optional[str] = None
    target_number: Optional[str] = None
    matched_rule: Optional[dict[str, Any]] = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "escalate": self.escalate,
            "priority": self.priority,
            "reason": self.reason,
            "target_department": self.target_department,
            "target_number": self.target_number,
            "matched_rule": self.matched_rule,
        }


class EscalationEvaluator:
    """Evaluate whether to escalate, from rules + conversation signals.

    ``escalation_rules`` entry schema (all optional)::

        {
          "when": {"intent": "billing", "keyword": "refund",
                   "sentiment": "negative", "min_repeats": 2},
          "priority": "high",
          "department": "billing",
          "target_number": "+1...",
          "reason": "Billing disputes go to the finance desk"
        }
    """

    def evaluate(
        self,
        text: str,
        *,
        rules: Optional[list[dict[str, Any]]] = None,
        sentiment: Optional[str] = None,
        intent: Optional[str] = None,
        repeat_count: int = 0,
    ) -> EscalationDecision:
        text_l = (text or "").lower()
        rules = rules or []

        # 1) Explicit configured rules win.
        for rule in rules:
            when = rule.get("when", {}) or {}
            if when.get("intent") and when["intent"] != intent:
                continue
            if when.get("sentiment") and when["sentiment"] != sentiment:
                continue
            kw = when.get("keyword")
            if kw and kw.lower() not in text_l:
                continue
            if when.get("min_repeats") and repeat_count < int(when["min_repeats"]):
                continue
            # All present conditions matched.
            if when:  # don't match an empty/unconditional rule by accident
                return EscalationDecision(
                    escalate=True,
                    priority=rule.get("priority", TicketPriority.high),
                    reason=rule.get("reason") or "Matched escalation rule",
                    target_department=rule.get("department"),
                    target_number=rule.get("target_number"),
                    matched_rule=rule,
                )

        # 2) Signal-based fallbacks.
        if any(w in text_l for w in _HUMAN_WORDS):
            return EscalationDecision(True, TicketPriority.high, "Caller requested a human agent")
        if any(w in text_l for w in _ANGER_WORDS) or sentiment == "negative":
            return EscalationDecision(True, TicketPriority.high, "Negative sentiment / dissatisfied caller")
        if any(w in text_l for w in _URGENT_WORDS):
            return EscalationDecision(True, TicketPriority.urgent, "Urgent / critical issue")
        if repeat_count >= 3:
            return EscalationDecision(True, TicketPriority.high, "Issue unresolved after multiple attempts")

        return EscalationDecision(False, TicketPriority.normal, None)


# ────────────────────────────── ticket drafting ──────────────────────────────

_CATEGORY_KEYWORDS = {
    "billing": ["bill", "charge", "invoice", "refund", "payment", "subscription", "pricing"],
    "technical": ["error", "bug", "broken", "not working", "crash", "down", "outage", "slow", "login"],
    "warranty": ["warranty", "guarantee", "replacement", "defective", "faulty"],
    "returns": ["return", "exchange", "send back", "rma"],
    "shipping": ["shipping", "delivery", "tracking", "package", "order status", "delayed"],
    "account": ["account", "password", "reset", "access", "profile", "settings"],
}


@dataclass
class TicketDraft:
    subject: str
    body: str
    category: Optional[str]
    priority: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "subject": self.subject,
            "body": self.body,
            "category": self.category,
            "priority": self.priority,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
        }


class TicketDrafter:
    def categorize(self, text: str) -> Optional[str]:
        text_l = (text or "").lower()
        best, best_hits = None, 0
        for cat, kws in _CATEGORY_KEYWORDS.items():
            hits = sum(1 for k in kws if k in text_l)
            if hits > best_hits:
                best, best_hits = cat, hits
        return best

    def draft(
        self,
        text: str,
        *,
        priority: str = TicketPriority.normal,
        category: Optional[str] = None,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> TicketDraft:
        cat = category or self.categorize(text)
        # Subject = first sentence / clause, trimmed.
        first = re.split(r"[.!?\n]", (text or "").strip(), maxsplit=1)[0].strip()
        subject = (first[:117] + "…") if len(first) > 118 else first
        if not subject:
            subject = f"{(cat or 'general').title()} enquiry"
        body = summary or text or ""
        return TicketDraft(
            subject=subject, body=body, category=cat, priority=priority,
            customer_name=customer_name, customer_phone=customer_phone,
        )


# ────────────────────────────── summarisation ────────────────────────────────

_POSITIVE = ["thank", "great", "perfect", "appreciate", "happy", "resolved", "awesome", "good"]
_NEGATIVE = _ANGER_WORDS


@dataclass
class CallSummary:
    issue: str
    resolution: Optional[str]
    sentiment: str
    action_items: list[str] = field(default_factory=list)
    category: Optional[str] = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "issue": self.issue,
            "resolution": self.resolution,
            "sentiment": self.sentiment,
            "action_items": self.action_items,
            "category": self.category,
        }


class CallSummarizer:
    def _sentiment(self, text_l: str) -> str:
        pos = sum(1 for w in _POSITIVE if w in text_l)
        neg = sum(1 for w in _NEGATIVE if w in text_l)
        if neg > pos:
            return "negative"
        if pos > neg:
            return "positive"
        return "neutral"

    def summarize(
        self,
        text: str,
        *,
        resolved: Optional[bool] = None,
        category: Optional[str] = None,
    ) -> CallSummary:
        text_l = (text or "").lower()
        first = re.split(r"[.!?\n]", (text or "").strip(), maxsplit=1)[0].strip()
        issue = (first[:200]) if first else "Customer enquiry"
        sentiment = self._sentiment(text_l)

        action_items: list[str] = []
        if "call back" in text_l or "follow up" in text_l or "callback" in text_l:
            action_items.append("Schedule follow-up callback")
        if "email" in text_l:
            action_items.append("Send confirmation email")
        if "refund" in text_l:
            action_items.append("Process refund request")
        if "replace" in text_l or "replacement" in text_l:
            action_items.append("Arrange replacement")

        if resolved is True:
            resolution = "Resolved on call"
        elif resolved is False:
            resolution = "Unresolved — requires follow-up"
        else:
            resolution = "Resolved on call" if any(w in text_l for w in _POSITIVE) else None

        return CallSummary(
            issue=issue, resolution=resolution, sentiment=sentiment,
            action_items=action_items, category=category,
        )


escalation_evaluator = EscalationEvaluator()
ticket_drafter = TicketDrafter()
call_summarizer = CallSummarizer()
