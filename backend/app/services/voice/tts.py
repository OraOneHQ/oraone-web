"""Text-to-Speech abstraction (Phase 1.7).

Vendor-neutral TTS interface. ElevenLabs is the primary implementation
over its REST API via httpx. Returns raw audio bytes in the requested
format (mp3 for playback / mulaw 8k for telephony media streams).

Swapping in Cartesia / OpenAI / Amazon Polly later is a new class + a
factory entry.
"""
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import httpx

from app.services.voice.config import VoiceConfig, get_voice_config

log = logging.getLogger("app.voice.tts")


class TTSError(RuntimeError):
    pass


@dataclass
class SynthesisResult:
    audio: bytes
    content_type: str
    format: str


class TTSProvider(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    async def synthesize(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "mp3",
        sample_rate: int = 8000,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        speed: float = 1.0,
    ) -> SynthesisResult:
        """Render ``text`` to speech audio bytes."""

    async def synthesize_stream(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "mp3",
        sample_rate: int = 8000,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        speed: float = 1.0,
    ) -> AsyncIterator[bytes]:
        """Yield speech audio bytes as they are produced.

        Default implementation falls back to a single blocking ``synthesize``
        call so non-streaming providers still work. Streaming providers should
        override this to emit audio chunks the instant the vendor returns them.
        """
        result = await self.synthesize(
            text,
            voice_id=voice_id,
            model=model,
            output_format=output_format,
            sample_rate=sample_rate,
            stability=stability,
            similarity_boost=similarity_boost,
            style=style,
            speed=speed,
        )
        if result.audio:
            yield result.audio

    async def aclose(self) -> None:  # noqa: D401 - optional resource cleanup
        """Release any persistent resources (overridden by streaming providers)."""
        return None


class ElevenLabsTTS(TTSProvider):
    name = "elevenlabs"
    _ROOT = "https://api.elevenlabs.io/v1"

    # OraOne format → ElevenLabs ``output_format`` query value.
    _FORMATS = {
        "mp3": "mp3_44100_128",
        "pcm": "pcm_16000",
        "mulaw": "ulaw_8000",      # telephony (Twilio media streams)
        "ulaw": "ulaw_8000",
    }
    _CONTENT_TYPES = {
        "mp3": "audio/mpeg",
        "pcm": "audio/L16",
        "mulaw": "audio/basic",
        "ulaw": "audio/basic",
    }

    def __init__(self, cfg: Optional[VoiceConfig] = None) -> None:
        self.cfg = cfg or get_voice_config()
        if not self.cfg.elevenlabs_configured:
            raise TTSError("ElevenLabs is not configured (set ELEVENLABS_API_KEY).")
        # Persistent HTTP client reused across a call's turns so we pay the
        # TLS/connection handshake once instead of per sentence.
        self._client: Optional[httpx.AsyncClient] = None

    def _stream_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=5.0),
                limits=httpx.Limits(max_keepalive_connections=4, keepalive_expiry=30.0),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            try:
                await self._client.aclose()
            finally:
                self._client = None

    async def synthesize(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "mp3",
        sample_rate: int = 8000,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        speed: float = 1.0,
    ) -> SynthesisResult:
        vid = voice_id or self.cfg.elevenlabs_default_voice
        fmt = output_format.lower()
        el_format = self._FORMATS.get(fmt, "mp3_44100_128")
        url = f"{self._ROOT}/text-to-speech/{vid}/stream"
        headers = {
            "xi-api-key": self.cfg.elevenlabs_api_key,
            "Content-Type": "application/json",
            "Accept": self._CONTENT_TYPES.get(fmt, "audio/mpeg"),
        }
        payload = {
            "text": text,
            "model_id": model or "eleven_turbo_v2_5",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "speed": speed,
                "use_speaker_boost": True,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url, params={"output_format": el_format}, headers=headers, json=payload
                )
            if resp.status_code >= 400:
                raise TTSError(f"ElevenLabs failed: {resp.status_code} {resp.text[:300]}")
            audio = resp.content
        except httpx.HTTPError as e:
            raise TTSError(f"ElevenLabs transport error: {e}") from e
        return SynthesisResult(
            audio=audio,
            content_type=self._CONTENT_TYPES.get(fmt, "audio/mpeg"),
            format=fmt,
        )

    async def synthesize_stream(
        self,
        text: str,
        *,
        voice_id: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "mp3",
        sample_rate: int = 8000,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        speed: float = 1.0,
    ) -> AsyncIterator[bytes]:
        """Stream audio chunks from ElevenLabs as they are rendered.

        Uses the ``/stream`` endpoint with ``optimize_streaming_latency`` so the
        first audio bytes arrive in a few hundred ms — the key to <1s replies.
        """
        vid = voice_id or self.cfg.elevenlabs_default_voice
        fmt = output_format.lower()
        el_format = self._FORMATS.get(fmt, "mp3_44100_128")
        url = f"{self._ROOT}/text-to-speech/{vid}/stream"
        headers = {
            "xi-api-key": self.cfg.elevenlabs_api_key,
            "Content-Type": "application/json",
            "Accept": self._CONTENT_TYPES.get(fmt, "audio/mpeg"),
        }
        payload = {
            "text": text,
            "model_id": model or "eleven_turbo_v2_5",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "speed": speed,
                "use_speaker_boost": True,
            },
        }
        params = {"output_format": el_format, "optimize_streaming_latency": "3"}
        client = self._stream_client()
        try:
            async with client.stream(
                "POST", url, params=params, headers=headers, json=payload
            ) as resp:
                if resp.status_code >= 400:
                    body = (await resp.aread())[:300]
                    raise TTSError(f"ElevenLabs stream failed: {resp.status_code} {body!r}")
                async for chunk in resp.aiter_bytes():
                    if chunk:
                        yield chunk
        except httpx.HTTPError as e:
            raise TTSError(f"ElevenLabs transport error: {e}") from e

    async def list_voices(self) -> list[dict]:
        headers = {"xi-api-key": self.cfg.elevenlabs_api_key}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(f"{self._ROOT}/voices", headers=headers)
            if resp.status_code >= 400:
                raise TTSError(f"ElevenLabs voices failed: {resp.status_code}")
            return resp.json().get("voices", [])
        except httpx.HTTPError as e:
            raise TTSError(f"ElevenLabs transport error: {e}") from e


class StubTTS(TTSProvider):
    name = "stub"

    async def synthesize(self, text, *, voice_id=None, model=None, output_format="mp3", sample_rate=8000,
                         stability=0.5, similarity_boost=0.75, style=0.0, speed=1.0) -> SynthesisResult:
        return SynthesisResult(audio=b"", content_type="audio/mpeg", format=output_format)


_REGISTRY: dict[str, type[TTSProvider]] = {"elevenlabs": ElevenLabsTTS}


def get_tts(name: Optional[str] = None, *, cfg: Optional[VoiceConfig] = None) -> TTSProvider:
    cfg = cfg or get_voice_config()
    key = (name or cfg.default_tts_provider or "elevenlabs").lower()
    impl = _REGISTRY.get(key)
    if impl is None:
        return StubTTS()
    try:
        return impl(cfg)  # type: ignore[call-arg]
    except TTSError as e:
        log.warning("TTS %s unavailable (%s); using stub", key, e)
        return StubTTS()


def register_tts(name: str, impl: type[TTSProvider]) -> None:
    _REGISTRY[name.lower()] = impl
