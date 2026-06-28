"""Speech-to-Text abstraction (Phase 1.6).

Vendor-neutral STT interface. Deepgram is the primary implementation,
called over its REST ("prerecorded") API via httpx so we avoid adding a
vendor SDK or a raw-websocket dependency. The streaming layer buffers
audio per-utterance and flushes a short clip here on each speech pause,
which keeps latency low while staying transport-simple.

Swapping in OpenAI Realtime / Google / Amazon later is a new class + a
factory entry.
"""
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

from app.services.voice.config import VoiceConfig, get_voice_config

log = logging.getLogger("app.voice.stt")


class STTError(RuntimeError):
    pass


@dataclass
class Transcript:
    text: str
    confidence: float = 0.0
    language: Optional[str] = None
    is_final: bool = True
    words: list[dict[str, Any]] = field(default_factory=list)


class SpeechProvider(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    async def transcribe(
        self,
        audio: bytes,
        *,
        encoding: str = "mulaw",
        sample_rate: int = 8000,
        language: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Transcript:
        """Transcribe a short audio clip (one utterance)."""


class DeepgramSTT(SpeechProvider):
    name = "deepgram"
    _URL = "https://api.deepgram.com/v1/listen"

    def __init__(self, cfg: Optional[VoiceConfig] = None) -> None:
        self.cfg = cfg or get_voice_config()
        if not self.cfg.deepgram_configured:
            raise STTError("Deepgram is not configured (set DEEPGRAM_API_KEY).")

    async def transcribe(
        self,
        audio: bytes,
        *,
        encoding: str = "mulaw",
        sample_rate: int = 8000,
        language: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Transcript:
        params = {
            "model": model or "nova-2",
            "encoding": encoding,
            "sample_rate": str(sample_rate),
            "smart_format": "true",
            "punctuate": "true",
        }
        if language:
            params["language"] = language
        else:
            params["detect_language"] = "true"
        headers = {
            "Authorization": f"Token {self.cfg.deepgram_api_key}",
            "Content-Type": "audio/raw",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(self._URL, params=params, headers=headers, content=audio)
            if resp.status_code >= 400:
                raise STTError(f"Deepgram failed: {resp.status_code} {resp.text}")
            body = resp.json()
        except httpx.HTTPError as e:
            raise STTError(f"Deepgram transport error: {e}") from e
        return self._parse(body)

    @staticmethod
    def _parse(body: dict[str, Any]) -> Transcript:
        try:
            channel = body["results"]["channels"][0]
            alt = channel["alternatives"][0]
            return Transcript(
                text=alt.get("transcript", ""),
                confidence=float(alt.get("confidence", 0.0)),
                language=channel.get("detected_language") or body.get("results", {}).get("language"),
                is_final=True,
                words=alt.get("words", []),
            )
        except (KeyError, IndexError, TypeError):
            return Transcript(text="", confidence=0.0)


class StubSTT(SpeechProvider):
    """Echo-stub used when no key is configured (dev/tests)."""

    name = "stub"

    async def transcribe(self, audio: bytes, *, encoding="mulaw", sample_rate=8000, language=None, model=None) -> Transcript:
        return Transcript(text="", confidence=0.0, language=language)


_REGISTRY: dict[str, type[SpeechProvider]] = {"deepgram": DeepgramSTT}


def get_stt(name: Optional[str] = None, *, cfg: Optional[VoiceConfig] = None) -> SpeechProvider:
    cfg = cfg or get_voice_config()
    key = (name or cfg.default_stt_provider or "deepgram").lower()
    impl = _REGISTRY.get(key)
    if impl is None:
        return StubSTT()
    try:
        return impl(cfg)  # type: ignore[call-arg]
    except STTError as e:
        log.warning("STT %s unavailable (%s); using stub", key, e)
        return StubSTT()


def register_stt(name: str, impl: type[SpeechProvider]) -> None:
    _REGISTRY[name.lower()] = impl
