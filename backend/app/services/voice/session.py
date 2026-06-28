"""Voice Session Manager (Phase 1.4).

Holds the live state of an in-progress call: state machine, rolling
transcript (so the Agent bridge has conversational history without a DB
round-trip per turn), latency/token metrics and an event log.

Backing store is pluggable: Redis when ``REDIS_URL`` is set (so sessions
survive a worker restart and can be shared across processes), otherwise an
in-process dict. Both honour a TTL so abandoned calls are reaped.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from app.services.voice.config import get_voice_config

log = logging.getLogger("app.voice.session")


class CallState:
    initializing = "initializing"
    greeting = "greeting"
    listening = "listening"
    thinking = "thinking"
    speaking = "speaking"
    transferring = "transferring"
    voicemail = "voicemail"
    ended = "ended"
    ALL = {initializing, greeting, listening, thinking, speaking, transferring, voicemail, ended}


@dataclass
class TurnRecord:
    speaker: str               # caller|agent|human|system
    text: str
    ts: float = field(default_factory=time.time)
    confidence: float = 0.0
    latency_ms: Optional[float] = None


@dataclass
class VoiceSession:
    """In-memory representation of a live call."""

    id: str
    call_id: str
    agent_id: Optional[str] = None
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    provider: str = "twilio"
    provider_call_sid: Optional[str] = None
    caller_number: Optional[str] = None
    receiver_number: Optional[str] = None
    direction: str = "inbound"
    language: Optional[str] = None
    state: str = CallState.initializing
    start_time: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    turns: list[dict[str, Any]] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)
    tokens: int = 0
    interruptions: int = 0
    latencies_ms: list[float] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

    # ── helpers ──
    def add_turn(self, speaker: str, text: str, *, confidence: float = 0.0,
                 latency_ms: Optional[float] = None) -> None:
        self.turns.append(
            asdict(TurnRecord(speaker=speaker, text=text, confidence=confidence, latency_ms=latency_ms))
        )
        if latency_ms is not None:
            self.latencies_ms.append(latency_ms)
        self.last_activity = time.time()

    def log_event(self, kind: str, **data: Any) -> None:
        self.events.append({"kind": kind, "ts": time.time(), **data})

    @property
    def avg_latency_ms(self) -> float:
        return sum(self.latencies_ms) / len(self.latencies_ms) if self.latencies_ms else 0.0

    @property
    def duration_seconds(self) -> int:
        return int(time.time() - self.start_time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "VoiceSession":
        return cls(**d)


# ─────────────────────────────── stores ──────────────────────────────────────

class _InMemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, dict[str, Any]]] = {}

    async def get(self, sid: str) -> Optional[dict[str, Any]]:
        item = self._data.get(sid)
        if not item:
            return None
        expires, payload = item
        if expires and expires < time.time():
            self._data.pop(sid, None)
            return None
        return payload

    async def set(self, sid: str, payload: dict[str, Any], ttl: int) -> None:
        self._data[sid] = (time.time() + ttl if ttl else 0, payload)

    async def delete(self, sid: str) -> None:
        self._data.pop(sid, None)

    async def keys(self) -> list[str]:
        now = time.time()
        return [k for k, (exp, _) in self._data.items() if not exp or exp >= now]


class _RedisStore:
    def __init__(self, url: str) -> None:
        import redis.asyncio as redis  # lazy; only when REDIS_URL set

        self._redis = redis.from_url(url, encoding="utf-8", decode_responses=True)
        self._prefix = "voice:session:"

    async def get(self, sid: str) -> Optional[dict[str, Any]]:
        raw = await self._redis.get(self._prefix + sid)
        return json.loads(raw) if raw else None

    async def set(self, sid: str, payload: dict[str, Any], ttl: int) -> None:
        await self._redis.set(self._prefix + sid, json.dumps(payload), ex=ttl or None)

    async def delete(self, sid: str) -> None:
        await self._redis.delete(self._prefix + sid)

    async def keys(self) -> list[str]:
        out = []
        async for k in self._redis.scan_iter(match=self._prefix + "*"):
            out.append(k[len(self._prefix):])
        return out


class VoiceSessionManager:
    """Facade over the backing store with VoiceSession (de)serialization."""

    def __init__(self) -> None:
        self.cfg = get_voice_config()
        self.ttl = self.cfg.session_ttl_seconds
        self._store: Any
        if self.cfg.redis_configured:
            try:
                self._store = _RedisStore(self.cfg.redis_url)
                log.info("voice sessions: redis store enabled")
            except Exception as e:  # noqa: BLE001 — fall back gracefully
                log.warning("redis unavailable (%s); using in-memory voice sessions", e)
                self._store = _InMemoryStore()
        else:
            self._store = _InMemoryStore()

    async def create(self, **kwargs: Any) -> VoiceSession:
        sid = kwargs.pop("id", None) or uuid.uuid4().hex
        session = VoiceSession(id=sid, **kwargs)
        session.log_event("session_created")
        await self.save(session)
        return session

    async def get(self, sid: str) -> Optional[VoiceSession]:
        payload = await self._store.get(sid)
        return VoiceSession.from_dict(payload) if payload else None

    async def save(self, session: VoiceSession) -> None:
        session.last_activity = time.time()
        await self._store.set(session.id, session.to_dict(), self.ttl)

    async def set_state(self, session: VoiceSession, state: str) -> None:
        session.state = state
        session.log_event("state", to=state)
        await self.save(session)

    async def delete(self, sid: str) -> None:
        await self._store.delete(sid)

    async def list_active(self) -> list[VoiceSession]:
        out: list[VoiceSession] = []
        for k in await self._store.keys():
            s = await self.get(k)
            if s and s.state != CallState.ended:
                out.append(s)
        return out


# Process-wide singleton — created on first import.
_manager: Optional[VoiceSessionManager] = None


def get_session_manager() -> VoiceSessionManager:
    global _manager
    if _manager is None:
        _manager = VoiceSessionManager()
    return _manager
