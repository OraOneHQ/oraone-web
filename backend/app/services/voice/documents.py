"""AI Document Assistant (Phase W).

Extracts structured fields from customer documents (Aadhaar, PAN, Passport,
Driving License, Resume, Insurance, Medical Reports …). When OCR text is
available it is passed to the org's chat model to pull a clean field map;
otherwise a deterministic placeholder map is returned so the collect → verify
→ sync-to-CRM flow is testable. No new AI stack — it reuses ``get_provider``.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.providers import ChatMessage, DEFAULT_MODEL, get_provider

log = logging.getLogger("app.doc_assistant")

# Fields we try to extract per document kind (drives prompt + UI hints).
KIND_FIELDS: dict[str, list[str]] = {
    "aadhaar": ["full_name", "aadhaar_number", "date_of_birth", "gender", "address"],
    "pan": ["full_name", "pan_number", "father_name", "date_of_birth"],
    "passport": ["full_name", "passport_number", "nationality", "date_of_birth", "expiry_date"],
    "driving_license": ["full_name", "license_number", "date_of_birth", "valid_till", "address"],
    "resume": ["full_name", "email", "phone", "current_title", "years_experience", "skills"],
    "insurance": ["policy_holder", "policy_number", "provider", "sum_insured", "valid_till"],
    "medical_report": ["patient_name", "report_type", "date", "summary"],
    "other": ["full_name", "document_number", "date"],
}


def _extract_json(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        a, b = text.find("{"), text.rfind("}")
        if a != -1 and b != -1 and b > a:
            text = text[a : b + 1]
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


async def extract_fields(kind: str, ocr_text: str) -> tuple[dict[str, Any], int]:
    """Return (fields, confidence 0-100) for a document of ``kind``."""
    fields = KIND_FIELDS.get(kind, KIND_FIELDS["other"])
    ocr_text = (ocr_text or "").strip()
    if not ocr_text:
        # Nothing to read yet — return the expected empty shape, low confidence.
        return ({f: "" for f in fields}, 0)

    system = (
        "You extract structured data from a scanned/OCR'd document. Return STRICT "
        "JSON only with exactly these keys: " + ", ".join(fields) + ". "
        "Use empty string for anything not present. Do not invent values."
    )
    user = f"Document type: {kind}\nOCR text:\n{ocr_text[:6000]}\n\nExtract the fields now."
    try:
        provider = get_provider()
        resp = await provider.chat(
            [ChatMessage(role="system", content=system), ChatMessage(role="user", content=user)],
            model=DEFAULT_MODEL,
            temperature=0.1,
            max_tokens=600,
        )
        data = _extract_json(resp.content)
        if data:
            clean = {f: str(data.get(f, "") or "").strip() for f in fields}
            filled = sum(1 for v in clean.values() if v)
            confidence = int(round(100 * filled / max(1, len(fields))))
            return (clean, confidence)
    except Exception as e:  # noqa: BLE001 — degrade gracefully
        log.info("document extraction fell back: %s", e)
    return ({f: "" for f in fields}, 0)
