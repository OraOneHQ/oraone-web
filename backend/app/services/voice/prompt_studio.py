"""AI Prompt Studio (Phase S).

Turns a short business description into a ready-to-use voice-agent blueprint:
a system prompt, an opening greeting, a step-by-step conversation flow, a
suggested voice style and a knowledge-base structure — so operators never
have to hand-write prompts.

The generation reuses the org's configured chat provider (OpenRouter) via
``get_provider``; there is no separate AI stack. If the model is unavailable
or returns malformed JSON we fall back to a deterministic, useful blueprint so
the endpoint always succeeds.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from app.providers import ChatMessage, DEFAULT_MODEL, get_provider

log = logging.getLogger("app.prompt_studio")

# 26 industry starting points surfaced in the UI as quick-pick chips.
INDUSTRY_TEMPLATES: list[dict[str, str]] = [
    {"value": "real_estate", "label": "Real Estate", "goal": "qualify buyers and book viewings"},
    {"value": "healthcare", "label": "Healthcare / Clinics", "goal": "book appointments and triage"},
    {"value": "dental", "label": "Dental", "goal": "schedule cleanings and recalls"},
    {"value": "insurance", "label": "Insurance", "goal": "quote policies and renew cover"},
    {"value": "automotive", "label": "Automotive", "goal": "book test drives and service"},
    {"value": "restaurant", "label": "Restaurant", "goal": "take reservations and orders"},
    {"value": "hospitality", "label": "Hotels & Hospitality", "goal": "manage bookings and concierge"},
    {"value": "ecommerce", "label": "E-commerce / Retail", "goal": "track orders and recover carts"},
    {"value": "education", "label": "Education", "goal": "enrol students and answer FAQs"},
    {"value": "fitness", "label": "Fitness & Gyms", "goal": "sign up members and book classes"},
    {"value": "legal", "label": "Legal", "goal": "intake clients and schedule consults"},
    {"value": "finance", "label": "Banking & Finance", "goal": "service accounts and collect"},
    {"value": "saas", "label": "SaaS / Tech", "goal": "demo, onboard and support"},
    {"value": "telecom", "label": "Telecom", "goal": "upgrade plans and support"},
    {"value": "travel", "label": "Travel & Tourism", "goal": "plan trips and confirm bookings"},
    {"value": "logistics", "label": "Logistics & Delivery", "goal": "schedule pickups and track"},
    {"value": "home_services", "label": "Home Services", "goal": "book visits and quote jobs"},
    {"value": "salon", "label": "Salon & Spa", "goal": "book treatments and upsell"},
    {"value": "events", "label": "Events", "goal": "register guests and sell tickets"},
    {"value": "nonprofit", "label": "Non-profit", "goal": "drive donations and volunteers"},
    {"value": "government", "label": "Government / Public", "goal": "answer citizen queries"},
    {"value": "manufacturing", "label": "Manufacturing", "goal": "take orders and support"},
    {"value": "agriculture", "label": "Agriculture", "goal": "advise and take orders"},
    {"value": "recruitment", "label": "Recruitment / HR", "goal": "screen and schedule interviews"},
    {"value": "utilities", "label": "Utilities", "goal": "handle billing and outages"},
    {"value": "general", "label": "General Business", "goal": "answer questions and capture leads"},
]

_TEMPLATE_BY_VALUE = {t["value"]: t for t in INDUSTRY_TEMPLATES}

_SYSTEM = (
    "You are an expert conversation designer for human-sounding phone agents. "
    "Given a business, produce a complete voice-agent blueprint. Respond with "
    "STRICT JSON only (no markdown, no commentary) using exactly this shape:\n"
    "{\n"
    '  "system_prompt": string,        // persona + rules, 120-220 words. Write it so the agent presents as a real human member of the team and NEVER reveals or admits being an AI, bot, virtual agent or assistant\n'
    '  "greeting": string,             // first spoken line, < 30 words, warm and human (no "AI"/"assistant"/"automated")\n'
    '  "conversation_flow": [string],  // 5-8 ordered steps\n'
    '  "voice_style": string,          // e.g. "warm, natural, human, unhurried"\n'
    '  "knowledge_structure": [string],// 4-7 KB sections to populate\n'
    '  "suggested_questions": [string] // 3-5 questions the agent should ask\n'
    "}\n"
    "Keep it natural for speech (short sentences, contractions, a natural human "
    "accent, no bullet symbols in spoken text). The agent must sound like a "
    "person, never disclose it is automated, and never invent prices or legal "
    "claims."
)

_ALLOWED_KEYS = {
    "system_prompt",
    "greeting",
    "conversation_flow",
    "voice_style",
    "knowledge_structure",
    "suggested_questions",
}


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    """Best-effort parse of a JSON object from a model response."""
    text = (text or "").strip()
    if not text:
        return None
    # Strip code fences if present.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        brace = text.find("{")
        last = text.rfind("}")
        if brace != -1 and last != -1 and last > brace:
            text = text[brace : last + 1]
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def _coerce(data: dict[str, Any]) -> dict[str, Any]:
    """Normalise model output to the contract, dropping unknown keys."""
    out: dict[str, Any] = {}
    out["system_prompt"] = str(data.get("system_prompt") or "").strip()
    out["greeting"] = str(data.get("greeting") or "").strip()
    out["voice_style"] = str(data.get("voice_style") or "").strip()
    for list_key in ("conversation_flow", "knowledge_structure", "suggested_questions"):
        raw = data.get(list_key) or []
        if isinstance(raw, str):
            raw = [raw]
        out[list_key] = [str(x).strip() for x in raw if str(x).strip()][:12]
    return out


def _fallback(business_type: str, business_name: str, goal: str) -> dict[str, Any]:
    name = business_name or "our business"
    tmpl = _TEMPLATE_BY_VALUE.get(business_type, _TEMPLATE_BY_VALUE["general"])
    label = tmpl["label"]
    goal = goal or tmpl["goal"]
    return {
        "system_prompt": (
            f"You are a friendly human member of the {name} team answering the phone, "
            f"working for a {label.lower()} business. "
            f"Your job is to {goal}. Speak naturally and concisely, one idea per sentence, "
            "with everyday spoken language, contractions and a natural human accent. "
            "Greet the caller, understand their need, ask one question at a time, and confirm "
            "details before acting. Be warm, patient and professional. If you do not know "
            "something, say so and offer to take a message or pass them to a colleague. Never invent "
            "prices, availability or legal information. Always confirm names, phone numbers and "
            "times by reading them back. Never reveal, hint or admit that you are an AI, bot, "
            "virtual agent, automated system or 'assistant' — you are a real person on the team; "
            "if asked, stay in character and continue helping. End by summarising next steps."
        ),
        "greeting": f"Hi, thanks for calling {name}! How can I help you today?",
        "conversation_flow": [
            "Greet the caller warmly and ask how you can help",
            "Identify the caller's intent and gather their name",
            "Ask qualifying questions one at a time",
            "Look up or confirm the relevant details",
            "Propose the next step (book, quote, or transfer)",
            "Confirm all details by reading them back",
            "Summarise next steps and close politely",
        ],
        "voice_style": "warm, professional, unhurried",
        "knowledge_structure": [
            "About the business and hours",
            "Products / services and what they include",
            "Pricing guidance and policies",
            "Booking and availability rules",
            "Frequently asked questions",
            "Escalation and contact details",
        ],
        "suggested_questions": [
            "May I have your name and best contact number?",
            "What can I help you with today?",
            "When would work best for you?",
        ],
    }


async def generate_blueprint(
    *,
    business_type: str,
    business_name: str = "",
    description: str = "",
    tone: str = "",
    goals: str = "",
    language: str = "en",
) -> dict[str, Any]:
    """Generate a voice-agent blueprint, with a deterministic fallback."""
    tmpl = _TEMPLATE_BY_VALUE.get(business_type, _TEMPLATE_BY_VALUE["general"])
    goal = goals or tmpl["goal"]
    user = (
        f"Business type: {tmpl['label']}\n"
        f"Business name: {business_name or 'N/A'}\n"
        f"Primary goal: {goal}\n"
        f"Description: {description or 'N/A'}\n"
        f"Preferred tone: {tone or 'warm and professional'}\n"
        f"Spoken language: {language or 'en'}\n"
        "Generate the blueprint now."
    )
    try:
        provider = get_provider()
        resp = await provider.chat(
            [ChatMessage(role="system", content=_SYSTEM), ChatMessage(role="user", content=user)],
            model=DEFAULT_MODEL,
            temperature=0.6,
            max_tokens=1100,
        )
        data = _extract_json(resp.content)
        if data:
            coerced = _coerce(data)
            if coerced.get("system_prompt") and coerced.get("greeting"):
                coerced["generated"] = True
                return coerced
    except Exception as e:  # noqa: BLE001 — always degrade to a usable blueprint
        log.info("prompt studio fell back to heuristic: %s", e)
    fb = _fallback(business_type, business_name, goal)
    fb["generated"] = False
    return fb
