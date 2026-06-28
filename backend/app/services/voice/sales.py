"""AI Sales engine (Phase 3).

Pure, telephony-independent logic that powers a sales conversation:

* **Lead qualification** — BANT (Budget / Authority / Need / Timeline) scoring
  from the running transcript or explicit answers, producing a 0-100 score, a
  hot/warm/cold tier, the missing dimensions, and the next best question.
* **Product recommendation** — ranks the agent's configured product catalogue
  against the caller's stated need (keyword + signal matching; the live call
  path can additionally fold in Knowledge-base RAG via the agent runtime).
* **Quote generation** — turns a product + quantity into a priced quote using
  the profile's pricing rules (base price, per-unit, volume discounts, tax).

Everything here is deterministic and unit-testable; the LLM is only an optional
enrichment so the engine degrades gracefully offline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

# ───────────────────────────── BANT qualification ────────────────────────────

BANT_DIMENSIONS = ("budget", "authority", "need", "timeline")

# Default weights — sum to 1.0. Overridable via profile.configuration["bant_weights"].
_DEFAULT_WEIGHTS = {"budget": 0.30, "authority": 0.20, "need": 0.30, "timeline": 0.20}

_SIGNALS: dict[str, list[str]] = {
    "budget": [
        "budget", "afford", "price", "cost", "spend", "investment", "dollars",
        "$", "per month", "per year", "k a year", "pricing", "quote",
    ],
    "authority": [
        "i decide", "i'm the owner", "i am the owner", "decision maker", "my company",
        "we are looking", "our team", "i can sign", "i approve", "ceo", "founder",
        "manager", "director", "head of",
    ],
    "need": [
        "need", "looking for", "problem", "struggling", "want to", "trying to",
        "challenge", "pain", "interested in", "help with", "solution", "require",
    ],
    "timeline": [
        "this week", "this month", "this quarter", "asap", "immediately", "soon",
        "by end of", "next month", "deadline", "urgent", "right away", "today",
    ],
}

_TIMELINE_URGENCY = {
    "today": 1.0, "asap": 1.0, "immediately": 1.0, "right away": 1.0, "urgent": 1.0,
    "this week": 0.95, "this month": 0.8, "next month": 0.6, "this quarter": 0.5,
    "deadline": 0.7, "soon": 0.5,
}

_NEXT_QUESTION = {
    "budget": "What budget range are you working with for this?",
    "authority": "Will you be the main decision-maker, or is there anyone else involved?",
    "need": "Can you tell me a bit more about what you're trying to solve?",
    "timeline": "When are you hoping to have this in place?",
}


@dataclass
class BANTScore:
    budget: float = 0.0
    authority: float = 0.0
    need: float = 0.0
    timeline: float = 0.0
    score: int = 0          # 0-100 weighted
    tier: str = "cold"      # hot|warm|cold
    missing: list[str] = field(default_factory=list)
    next_question: Optional[str] = None
    signals: dict[str, list[str]] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "budget": round(self.budget, 3),
            "authority": round(self.authority, 3),
            "need": round(self.need, 3),
            "timeline": round(self.timeline, 3),
            "score": self.score,
            "tier": self.tier,
            "missing": self.missing,
            "next_question": self.next_question,
            "signals": self.signals,
        }


class LeadQualifier:
    """Heuristic BANT scorer over free text + optional structured answers."""

    def score(
        self,
        text: str,
        *,
        answers: Optional[dict[str, Any]] = None,
        weights: Optional[dict[str, float]] = None,
    ) -> BANTScore:
        text_l = (text or "").lower()
        answers = answers or {}
        weights = {**_DEFAULT_WEIGHTS, **(weights or {})}

        dims: dict[str, float] = {}
        signals: dict[str, list[str]] = {}
        for dim in BANT_DIMENSIONS:
            # Explicit structured answer wins (0..1, or truthy → 1.0).
            if dim in answers and answers[dim] is not None:
                val = answers[dim]
                dims[dim] = float(val) if isinstance(val, (int, float)) else (1.0 if val else 0.0)
                dims[dim] = max(0.0, min(1.0, dims[dim]))
                signals[dim] = ["answer"]
                continue
            hits = [kw for kw in _SIGNALS[dim] if kw in text_l]
            signals[dim] = hits
            if not hits:
                dims[dim] = 0.0
                continue
            base = min(1.0, 0.5 + 0.18 * len(hits))
            if dim == "timeline":
                urgency = max((u for kw, u in _TIMELINE_URGENCY.items() if kw in text_l), default=0.0)
                base = max(base, urgency)
            if dim == "budget" and re.search(r"\$\s?\d", text_l):
                base = max(base, 0.85)
            dims[dim] = base

        weighted = sum(dims[d] * weights.get(d, 0.0) for d in BANT_DIMENSIONS)
        score = int(round(weighted * 100))
        tier = "hot" if score >= 70 else "warm" if score >= 40 else "cold"
        missing = [d for d in BANT_DIMENSIONS if dims[d] < 0.4]
        next_q = _NEXT_QUESTION.get(missing[0]) if missing else None

        return BANTScore(
            budget=dims["budget"], authority=dims["authority"],
            need=dims["need"], timeline=dims["timeline"],
            score=score, tier=tier, missing=missing,
            next_question=next_q, signals=signals,
        )


# ───────────────────────────── product recommendation ────────────────────────

@dataclass
class ProductMatch:
    product: dict[str, Any]
    relevance: float
    reasons: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "product": self.product,
            "relevance": round(self.relevance, 3),
            "reasons": self.reasons,
        }


def _tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(t) > 2}


class ProductRecommender:
    """Rank a configured product catalogue against a stated need."""

    def recommend(
        self,
        products: list[dict[str, Any]],
        need: str,
        *,
        top_k: int = 3,
    ) -> list[ProductMatch]:
        need_tokens = _tokenize(need)
        matches: list[ProductMatch] = []
        for p in products or []:
            haystack = " ".join(str(p.get(k, "")) for k in (
                "name", "description", "category", "tagline", "use_cases", "keywords",
            ))
            tags = p.get("keywords") or p.get("tags") or []
            if isinstance(tags, list):
                haystack += " " + " ".join(str(t) for t in tags)
            prod_tokens = _tokenize(haystack)
            overlap = need_tokens & prod_tokens
            if not overlap and need_tokens:
                continue
            relevance = (len(overlap) / max(1, len(need_tokens))) if need_tokens else 0.5
            reasons = [f"matches '{t}'" for t in sorted(overlap)][:5]
            matches.append(ProductMatch(product=p, relevance=relevance, reasons=reasons or ["catalogue default"]))
        matches.sort(key=lambda m: m.relevance, reverse=True)
        # If nothing matched (e.g. empty need), surface the catalogue head.
        if not matches and products:
            matches = [ProductMatch(product=p, relevance=0.3, reasons=["catalogue default"])
                       for p in products[:top_k]]
        return matches[:top_k]


# ───────────────────────────── quote generation ──────────────────────────────

@dataclass
class Quote:
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    discount: float
    discount_pct: float
    tax: float
    total: float
    currency: str = "USD"
    line_items: list[dict[str, Any]] = field(default_factory=list)
    notes: Optional[str] = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "product_name": self.product_name,
            "quantity": self.quantity,
            "unit_price": round(self.unit_price, 2),
            "subtotal": round(self.subtotal, 2),
            "discount": round(self.discount, 2),
            "discount_pct": round(self.discount_pct, 4),
            "tax": round(self.tax, 2),
            "total": round(self.total, 2),
            "currency": self.currency,
            "line_items": self.line_items,
            "notes": self.notes,
        }


class QuoteEngine:
    """Compute a priced quote from a product + pricing rules.

    pricing_rules schema (all optional):
        {
          "currency": "USD",
          "tax_rate": 0.08,
          "volume_discounts": [{"min_qty": 10, "pct": 0.05}, {"min_qty": 50, "pct": 0.12}],
          "setup_fee": 0.0
        }
    """

    def build(
        self,
        product: dict[str, Any],
        quantity: int,
        pricing_rules: Optional[dict[str, Any]] = None,
    ) -> Quote:
        rules = pricing_rules or {}
        quantity = max(1, int(quantity or 1))
        unit_price = float(
            product.get("price")
            or product.get("unit_price")
            or product.get("monthly_price")
            or 0.0
        )
        currency = product.get("currency") or rules.get("currency") or "USD"
        subtotal = unit_price * quantity

        # Best applicable volume discount.
        discount_pct = 0.0
        for tier in sorted(rules.get("volume_discounts", []), key=lambda t: t.get("min_qty", 0)):
            if quantity >= int(tier.get("min_qty", 0)):
                discount_pct = float(tier.get("pct", 0.0))
        # Product-level override.
        discount_pct = max(discount_pct, float(product.get("discount_pct", 0.0) or 0.0))
        discount = subtotal * discount_pct

        setup_fee = float(rules.get("setup_fee", 0.0) or 0.0)
        taxable = subtotal - discount + setup_fee
        tax_rate = float(rules.get("tax_rate", 0.0) or 0.0)
        tax = taxable * tax_rate
        total = taxable + tax

        line_items = [
            {"label": product.get("name", "Product"), "qty": quantity,
             "unit_price": round(unit_price, 2), "amount": round(subtotal, 2)},
        ]
        if setup_fee:
            line_items.append({"label": "Setup fee", "qty": 1,
                               "unit_price": round(setup_fee, 2), "amount": round(setup_fee, 2)})
        if discount:
            line_items.append({"label": f"Volume discount ({round(discount_pct*100)}%)",
                               "qty": 1, "unit_price": round(-discount, 2),
                               "amount": round(-discount, 2)})

        return Quote(
            product_name=product.get("name", "Product"),
            quantity=quantity, unit_price=unit_price, subtotal=subtotal,
            discount=discount, discount_pct=discount_pct, tax=tax, total=total,
            currency=currency, line_items=line_items,
            notes=product.get("quote_notes"),
        )


lead_qualifier = LeadQualifier()
product_recommender = ProductRecommender()
quote_engine = QuoteEngine()
