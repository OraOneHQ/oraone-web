"""Phase 9 — Enterprise Voice Intelligence engine.

Pure, dependency-light helpers for the enterprise tier:

* :data:`LANGUAGES`            — supported-language registry (9.1) with locale
                                  greetings, RTL flags and native names.
* :class:`TranslationEngine`   — real-time / transcript / summary translation
                                  (9.4), backed by the shared AI provider with a
                                  graceful identity fallback when offline.
* :data:`VOICE_STYLE_PROFILES` — built-in enterprise voice presets (9.2).

The translation engine never raises: callers on the live media path must
degrade gracefully, so a provider failure returns the original text with
``translated=False`` rather than breaking the call.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

log = logging.getLogger("voice.enterprise")


# ───────────────────────────── 9.1 language registry ─────────────────────────

@dataclass(frozen=True)
class Language:
    code: str            # ISO-639-1
    name: str            # English name
    native: str          # endonym
    rtl: bool = False
    greeting: str = ""   # locale-specific default greeting


# Ordered so the most common Indian + global languages surface first.
_LANGUAGE_LIST: list[Language] = [
    Language("en", "English", "English", greeting="Hello, thanks for calling. How can I help you today?"),
    Language("hi", "Hindi", "हिन्दी", greeting="नमस्ते, कॉल करने के लिए धन्यवाद। मैं आपकी कैसे मदद कर सकता हूँ?"),
    Language("te", "Telugu", "తెలుగు", greeting="నమస్కారం, కాల్ చేసినందుకు ధన్యవాదాలు. నేను మీకు ఎలా సహాయం చేయగలను?"),
    Language("ta", "Tamil", "தமிழ்", greeting="வணக்கம், அழைத்ததற்கு நன்றி. நான் உங்களுக்கு எப்படி உதவ முடியும்?"),
    Language("kn", "Kannada", "ಕನ್ನಡ", greeting="ನಮಸ್ಕಾರ, ಕರೆ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"),
    Language("ml", "Malayalam", "മലയാളം", greeting="നമസ്കാരം, വിളിച്ചതിന് നന്ദി. ഞാൻ എങ്ങനെ സഹായിക്കാം?"),
    Language("mr", "Marathi", "मराठी", greeting="नमस्कार, कॉल केल्याबद्दल धन्यवाद. मी तुम्हाला कशी मदत करू?"),
    Language("bn", "Bengali", "বাংলা", greeting="নমস্কার, কল করার জন্য ধন্যবাদ। আমি কীভাবে সাহায্য করতে পারি?"),
    Language("gu", "Gujarati", "ગુજરાતી", greeting="નમસ્તે, કૉલ કરવા બદલ આભાર. હું તમારી કેવી રીતે મદદ કરી શકું?"),
    Language("pa", "Punjabi", "ਪੰਜਾਬੀ", greeting="ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਕਾਲ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?"),
    Language("es", "Spanish", "Español", greeting="Hola, gracias por llamar. ¿Cómo puedo ayudarle hoy?"),
    Language("fr", "French", "Français", greeting="Bonjour, merci de votre appel. Comment puis-je vous aider ?"),
    Language("de", "German", "Deutsch", greeting="Hallo, danke für Ihren Anruf. Wie kann ich Ihnen helfen?"),
    Language("pt", "Portuguese", "Português", greeting="Olá, obrigado por ligar. Como posso ajudar?"),
    Language("it", "Italian", "Italiano", greeting="Salve, grazie per aver chiamato. Come posso aiutarla?"),
    Language("ar", "Arabic", "العربية", rtl=True, greeting="مرحباً، شكراً لاتصالك. كيف يمكنني مساعدتك؟"),
    Language("ja", "Japanese", "日本語", greeting="お電話ありがとうございます。ご用件をお伺いします。"),
    Language("ko", "Korean", "한국어", greeting="전화 주셔서 감사합니다. 무엇을 도와드릴까요?"),
    Language("zh", "Chinese", "中文", greeting="您好，感谢您的来电。我能为您做些什么？"),
]

LANGUAGES: dict[str, Language] = {lang.code: lang for lang in _LANGUAGE_LIST}


def is_supported(code: Optional[str]) -> bool:
    return bool(code) and code.lower() in LANGUAGES


def normalize_language(code: Optional[str], *, default: str = "en") -> str:
    """Coerce an arbitrary locale string (e.g. ``en-US``) to a supported code."""
    if not code:
        return default
    base = code.replace("_", "-").split("-", 1)[0].lower()
    return base if base in LANGUAGES else default


def greeting_for(code: Optional[str]) -> str:
    return LANGUAGES.get(normalize_language(code), LANGUAGES["en"]).greeting


# ───────────────────────────── 9.2 voice style presets ───────────────────────

VOICE_STYLE_PROFILES: dict[str, dict[str, object]] = {
    "corporate":   {"speed": 1.0, "pitch": 0.0, "energy": 0.4, "style": 0.2, "description": "Calm, authoritative, professional."},
    "friendly":    {"speed": 1.05, "pitch": 0.1, "energy": 0.7, "style": 0.5, "description": "Warm and approachable."},
    "sales":       {"speed": 1.1, "pitch": 0.1, "energy": 0.85, "style": 0.6, "description": "Energetic and persuasive."},
    "support":     {"speed": 0.98, "pitch": 0.0, "energy": 0.5, "style": 0.35, "description": "Patient and reassuring."},
    "healthcare":  {"speed": 0.95, "pitch": -0.05, "energy": 0.4, "style": 0.25, "description": "Gentle, clear, empathetic."},
    "banking":     {"speed": 1.0, "pitch": 0.0, "energy": 0.35, "style": 0.15, "description": "Precise, trustworthy, formal."},
    "hospitality": {"speed": 1.05, "pitch": 0.1, "energy": 0.75, "style": 0.55, "description": "Welcoming and upbeat."},
}


# ───────────────────────────── 9.4 translation engine ────────────────────────

@dataclass
class Translation:
    text: str
    source_language: str
    target_language: str
    translated: bool = True          # False when the engine fell back to identity
    provider: str = "ai"
    confidence: float = 1.0
    segments: list[dict] = field(default_factory=list)


class TranslationEngine:
    """Translate text between supported languages via the shared AI provider.

    Used for live conversation translation, transcript translation and summary
    translation (Phase 9.4). Falls back to returning the source text unchanged
    (``translated=False``) when the provider is unavailable so the call path
    never breaks.
    """

    def __init__(self, model: Optional[str] = None) -> None:
        self._model = model

    async def translate(
        self,
        text: str,
        target_language: str,
        *,
        source_language: Optional[str] = None,
        formality: str = "neutral",
    ) -> Translation:
        text = (text or "").strip()
        tgt = normalize_language(target_language)
        src = normalize_language(source_language) if source_language else ""

        if not text:
            return Translation(text="", source_language=src or "", target_language=tgt, translated=False)
        # No-op when source already equals target.
        if src and src == tgt:
            return Translation(text=text, source_language=src, target_language=tgt, translated=False)

        try:
            from app.providers import ChatMessage, DEFAULT_MODEL, get_provider

            tgt_name = LANGUAGES[tgt].name
            src_clause = f"from {LANGUAGES[src].name} " if src else ""
            sys = (
                f"You are a professional real-time interpreter. Translate the user's text "
                f"{src_clause}into {tgt_name}. Preserve meaning, tone and named entities. "
                f"Use {formality} formality. Respond with ONLY the translation — no quotes, "
                "no explanations, no preamble."
            )
            provider = get_provider()
            resp = await provider.chat(
                [ChatMessage(role="system", content=sys), ChatMessage(role="user", content=text)],
                model=self._model or DEFAULT_MODEL,
                temperature=0.1,
                max_tokens=600,
            )
            out = (resp.content or "").strip().strip('"')
            if not out:
                raise ValueError("empty translation")
            return Translation(
                text=out, source_language=src or "auto", target_language=tgt, translated=True,
            )
        except Exception as e:  # noqa: BLE001 — degrade gracefully, never break a call
            log.warning("translation failed (%s→%s): %s", src or "auto", tgt, e)
            return Translation(
                text=text, source_language=src or "auto", target_language=tgt,
                translated=False, confidence=0.0,
            )


# Process-wide singleton.
translation_engine = TranslationEngine()
