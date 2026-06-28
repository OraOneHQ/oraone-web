"""AI Payment Assistant (Phase V).

Lets an agent request a payment from a customer across multiple rails
(Stripe, Razorpay, PayPal, PhonePe, Google Pay, Apple Pay). When a provider
integration is configured the hosted-checkout link comes from that provider;
otherwise a deterministic placeholder link is produced so the collection flow
is testable end-to-end. Status transitions (sent → paid / failed / refunded)
are recorded for the CRM and analytics.
"""
from __future__ import annotations

import secrets
from typing import Optional

from app.database.models.voice import PAYMENT_PROVIDERS

# Currency presentation helpers (symbol + zero-decimal awareness kept simple).
_SYMBOLS = {"usd": "$", "eur": "€", "gbp": "£", "inr": "₹", "aud": "A$", "cad": "C$"}

# Where a provider's hosted checkout would live. Real integrations override this.
_PROVIDER_BASE = {
    "stripe": "https://pay.oraone.ai/stripe",
    "razorpay": "https://pay.oraone.ai/razorpay",
    "paypal": "https://pay.oraone.ai/paypal",
    "phonepe": "https://pay.oraone.ai/phonepe",
    "google_pay": "https://pay.oraone.ai/gpay",
    "apple_pay": "https://pay.oraone.ai/applepay",
}


def normalize_provider(provider: Optional[str]) -> str:
    p = (provider or "stripe").strip().lower()
    return p if p in PAYMENT_PROVIDERS else "stripe"


def format_amount(amount_cents: int, currency: str) -> str:
    sym = _SYMBOLS.get((currency or "usd").lower(), "")
    return f"{sym}{amount_cents / 100:,.2f}"


def build_reference() -> str:
    return "PAY-" + secrets.token_hex(4).upper()


def build_link(provider: str, reference: str) -> str:
    base = _PROVIDER_BASE.get(provider, _PROVIDER_BASE["stripe"])
    return f"{base}/{reference}"
