"""Voice platform configuration (env-driven).

All keys are optional at import time so the server still boots without
telephony credentials. Each provider check exposes ``*_configured`` flags
so endpoints can degrade gracefully (return 503 / use a stub) instead of
crashing when a key is missing.
"""
from __future__ import annotations

import os
from functools import lru_cache


def _get(*keys: str, default: str = "") -> str:
    for k in keys:
        v = os.environ.get(k)
        if v:
            return v.strip()
    return default


class VoiceConfig:
    """Lazily-read voice settings. Constructed via :func:`get_voice_config`."""

    def __init__(self) -> None:
        # ── Twilio (primary telephony) ──
        self.twilio_account_sid = _get("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = _get("TWILIO_AUTH_TOKEN")
        self.twilio_api_key = _get("TWILIO_API_KEY")
        self.twilio_api_secret = _get("TWILIO_API_SECRET")
        self.twilio_phone_number = _get("TWILIO_PHONE_NUMBER")

        # ── Deepgram (primary STT) ──
        self.deepgram_api_key = _get("DEEPGRAM_API_KEY")

        # ── ElevenLabs (primary TTS) ──
        self.elevenlabs_api_key = _get("ELEVENLABS_API_KEY")
        self.elevenlabs_default_voice = _get(
            "ELEVENLABS_DEFAULT_VOICE_ID", default="21m00Tcm4TlvDq8ikWAM"  # "Rachel"
        )

        # ── Defaults / providers ──
        self.default_provider = _get("VOICE_PROVIDER", default="twilio")
        self.default_stt_provider = _get("VOICE_STT_PROVIDER", default="deepgram")
        self.default_tts_provider = _get("VOICE_TTS_PROVIDER", default="elevenlabs")

        # ── Public base URL for provider webhooks/streams (ngrok / ALB) ──
        # e.g. https://voice.oraone.ai — used to build TwiML callback + WSS URLs.
        self.public_base_url = _get("VOICE_PUBLIC_BASE_URL", "PUBLIC_BASE_URL").rstrip("/")

        # ── Session store ──
        self.redis_url = _get("REDIS_URL", "VOICE_REDIS_URL")
        self.session_ttl_seconds = int(_get("VOICE_SESSION_TTL", default="3600"))

    # ── capability flags ──
    @property
    def twilio_configured(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token)

    @property
    def deepgram_configured(self) -> bool:
        return bool(self.deepgram_api_key)

    @property
    def elevenlabs_configured(self) -> bool:
        return bool(self.elevenlabs_api_key)

    @property
    def redis_configured(self) -> bool:
        return bool(self.redis_url)

    def public_wss_url(self, path: str) -> str:
        """Build a wss:// URL for a streaming endpoint from the public base."""
        base = self.public_base_url
        if not base:
            return path
        if base.startswith("https://"):
            base = "wss://" + base[len("https://"):]
        elif base.startswith("http://"):
            base = "ws://" + base[len("http://"):]
        if not path.startswith("/"):
            path = "/" + path
        return base + path

    def public_https_url(self, path: str) -> str:
        base = self.public_base_url
        if not path.startswith("/"):
            path = "/" + path
        return (base + path) if base else path


@lru_cache(maxsize=1)
def get_voice_config() -> VoiceConfig:
    return VoiceConfig()
