"""Telephony provider abstraction (Phase 1.3).

Business logic must never import Twilio (or any vendor) directly. It talks
to the :class:`VoiceProvider` interface and obtains an implementation from
:func:`get_provider`. Adding Exotel / Plivo / SignalWire later is a new
class + a factory entry, with zero changes to callers.
"""
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass, field
from typing import Any, Optional
from xml.sax.saxutils import escape

import httpx

from app.services.voice.config import VoiceConfig, get_voice_config

log = logging.getLogger("app.voice.providers")


class VoiceProviderError(RuntimeError):
    """Raised when a provider call fails or the provider is unconfigured."""


@dataclass
class CallHandle:
    """Result of starting/placing a call."""

    provider: str
    call_sid: str
    status: str = "queued"
    raw: dict[str, Any] = field(default_factory=dict)


class VoiceProvider(abc.ABC):
    """Vendor-neutral telephony interface."""

    name: str = "base"

    @abc.abstractmethod
    async def start_call(
        self,
        *,
        to_number: str,
        from_number: str,
        stream_url: str,
        answer_url: Optional[str] = None,
        greeting: Optional[str] = None,
        parameters: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> CallHandle:
        """Place an outbound call that bridges audio to ``stream_url`` (wss)."""

    @abc.abstractmethod
    async def end_call(self, call_sid: str) -> None:
        """Hang up an active call."""

    @abc.abstractmethod
    async def transfer_call(self, call_sid: str, *, to_number: str) -> None:
        """Redirect a live call to a human / another number."""

    @abc.abstractmethod
    def build_answer_response(self, *, stream_url: str, greeting: Optional[str] = None) -> str:
        """Return the provider markup (e.g. TwiML) that answers an inbound
        call and opens a bidirectional media stream to ``stream_url``."""

    @abc.abstractmethod
    def media_response_content_type(self) -> str:
        """Content-Type for :meth:`build_answer_response` output."""

    @abc.abstractmethod
    def verify_webhook(self, *, url: str, params: dict[str, str], signature: str) -> bool:
        """Validate an inbound webhook signature. Returns True when trusted."""


# ───────────────────────────────── Twilio ────────────────────────────────────

class TwilioProvider(VoiceProvider):
    """Twilio implementation using the REST API over httpx (no SDK dependency).

    Uses Twilio Programmable Voice + Media Streams. Audio is bridged to our
    WebSocket via the ``<Connect><Stream>`` TwiML verb.
    """

    name = "twilio"
    _API_ROOT = "https://api.twilio.com/2010-04-01"

    def __init__(self, cfg: Optional[VoiceConfig] = None) -> None:
        self.cfg = cfg or get_voice_config()
        if not self.cfg.twilio_configured:
            raise VoiceProviderError(
                "Twilio is not configured (set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)."
            )

    @property
    def _auth(self) -> tuple[str, str]:
        return (self.cfg.twilio_account_sid, self.cfg.twilio_auth_token)

    async def start_call(
        self,
        *,
        to_number: str,
        from_number: str,
        stream_url: str,
        answer_url: Optional[str] = None,
        greeting: Optional[str] = None,
        parameters: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> CallHandle:
        url = f"{self._API_ROOT}/Accounts/{self.cfg.twilio_account_sid}/Calls.json"
        data: dict[str, str] = {
            "To": to_number,
            "From": from_number or self.cfg.twilio_phone_number,
        }
        if answer_url:
            data["Url"] = answer_url
        else:
            # Inline TwiML via the Twiml param so we don't need a hosted URL.
            data["Twiml"] = self.build_answer_response(
                stream_url=stream_url, greeting=greeting, parameters=parameters
            )
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, data=data, auth=self._auth)
            if resp.status_code >= 400:
                raise VoiceProviderError(f"Twilio start_call failed: {resp.status_code} {resp.text}")
            body = resp.json()
        except httpx.HTTPError as e:  # network-level
            raise VoiceProviderError(f"Twilio start_call transport error: {e}") from e
        return CallHandle(
            provider=self.name,
            call_sid=body.get("sid", ""),
            status=body.get("status", "queued"),
            raw=body,
        )

    async def end_call(self, call_sid: str) -> None:
        url = f"{self._API_ROOT}/Accounts/{self.cfg.twilio_account_sid}/Calls/{call_sid}.json"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, data={"Status": "completed"}, auth=self._auth)
            if resp.status_code >= 400:
                raise VoiceProviderError(f"Twilio end_call failed: {resp.status_code} {resp.text}")
        except httpx.HTTPError as e:
            raise VoiceProviderError(f"Twilio end_call transport error: {e}") from e

    async def transfer_call(self, call_sid: str, *, to_number: str) -> None:
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Dial>{escape(to_number)}</Dial></Response>'
        url = f"{self._API_ROOT}/Accounts/{self.cfg.twilio_account_sid}/Calls/{call_sid}.json"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, data={"Twiml": twiml}, auth=self._auth)
            if resp.status_code >= 400:
                raise VoiceProviderError(f"Twilio transfer failed: {resp.status_code} {resp.text}")
        except httpx.HTTPError as e:
            raise VoiceProviderError(f"Twilio transfer transport error: {e}") from e

    def build_answer_response(
        self,
        *,
        stream_url: str,
        greeting: Optional[str] = None,
        parameters: Optional[dict[str, Any]] = None,
    ) -> str:
        greet = (
            f"<Say>{escape(greeting)}</Say>" if greeting else ""
        )
        # Twilio Media Streams does NOT reliably forward URL query-string params,
        # so identifiers are passed as <Parameter> children — these arrive in the
        # ``start`` event's ``customParameters``.
        params_xml = "".join(
            f'<Parameter name="{escape(str(k))}" value="{escape(str(v))}"/>'
            for k, v in (parameters or {}).items()
            if v is not None
        )
        # <Connect><Stream> opens a bidirectional media stream (Twilio →
        # our WSS endpoint). The call stays up until we hang up or the
        # caller disconnects.
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            f"{greet}"
            f'<Connect><Stream url="{escape(stream_url)}">{params_xml}</Stream></Connect>'
            "</Response>"
        )

    def media_response_content_type(self) -> str:
        return "application/xml"

    def verify_webhook(self, *, url: str, params: dict[str, str], signature: str) -> bool:
        # Twilio signs requests with HMAC-SHA1 over the URL + sorted POST
        # params, keyed by the auth token. We compute it the same way.
        import base64
        import hashlib
        import hmac

        if not signature:
            return False
        s = url
        for key in sorted(params.keys()):
            s += key + params[key]
        digest = hmac.new(
            self.cfg.twilio_auth_token.encode("utf-8"), s.encode("utf-8"), hashlib.sha1
        ).digest()
        expected = base64.b64encode(digest).decode("utf-8")
        return hmac.compare_digest(expected, signature)


# ─────────────────────────── stub / factory ──────────────────────────────────

class StubVoiceProvider(VoiceProvider):
    """No-credential fallback used in dev / tests. Records intent, no I/O."""

    name = "stub"

    def __init__(self, provider_name: str = "stub") -> None:
        self.name = provider_name
        self.calls: list[dict[str, Any]] = []

    async def start_call(self, *, to_number, from_number, stream_url, answer_url=None, greeting=None, parameters=None, metadata=None) -> CallHandle:
        import uuid as _uuid

        sid = f"STUB-{_uuid.uuid4().hex[:24]}"
        self.calls.append({"sid": sid, "to": to_number, "from": from_number})
        return CallHandle(provider=self.name, call_sid=sid, status="queued")

    async def end_call(self, call_sid: str) -> None:
        return None

    async def transfer_call(self, call_sid: str, *, to_number: str) -> None:
        return None

    def build_answer_response(self, *, stream_url: str, greeting: Optional[str] = None) -> str:
        greet = f"<Say>{escape(greeting)}</Say>" if greeting else ""
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f"<Response>{greet}<Connect><Stream url=\"{escape(stream_url)}\"/></Connect></Response>"
        )

    def media_response_content_type(self) -> str:
        return "application/xml"

    def verify_webhook(self, *, url, params, signature) -> bool:
        return True


_REGISTRY: dict[str, type[VoiceProvider]] = {
    "twilio": TwilioProvider,
}


def get_provider(name: Optional[str] = None, *, cfg: Optional[VoiceConfig] = None) -> VoiceProvider:
    """Return a configured provider, or a stub when credentials are absent.

    Never raises for a missing key — callers that *require* real telephony
    should check ``isinstance(p, StubVoiceProvider)`` or the config flags.
    """
    cfg = cfg or get_voice_config()
    key = (name or cfg.default_provider or "twilio").lower()
    impl = _REGISTRY.get(key)
    if impl is None:
        log.warning("unknown voice provider %r; falling back to stub", key)
        return StubVoiceProvider(key)
    try:
        return impl(cfg)  # type: ignore[call-arg]
    except VoiceProviderError as e:
        log.warning("provider %s unavailable (%s); using stub", key, e)
        return StubVoiceProvider(key)


def register_provider(name: str, impl: type[VoiceProvider]) -> None:
    """Register a new provider implementation (Exotel/Plivo/SignalWire…)."""
    _REGISTRY[name.lower()] = impl
