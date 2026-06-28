"""Twilio Media Streams handler (Phase 1.5 — streaming layer).

Implements the bidirectional audio loop for a live call over a WebSocket:

    Twilio media (μ-law 8k) ──► VAD utterance ──► STT ──► Agent bridge
                                                              │
        Twilio media frames ◄── μ-law ◄── TTS ◄──────────────┘

The Media Streams protocol sends JSON frames: ``connected`` / ``start`` /
``media`` (base64 μ-law) / ``stop``. We buffer inbound audio, detect an
end-of-utterance with a simple energy + silence VAD (Python 3.14 dropped
``audioop`` so μ-law is decoded inline), then run one turn through the
existing Agent Runtime and stream the synthesized reply back.

Note: full real-time barge-in / interim transcripts are a Phase 9 concern;
this establishes the correct, provider-neutral pipeline.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.models.agent import Agent
from app.database.models.voice import (
    CallStatus,
    SpeakerRole,
    TranscriptStatus,
    VoiceCall,
    VoiceMessage,
    VoiceProfile,
)
from app.database.session import session_scope
from app.middleware.org_context import OrgContext
from app.services import visitor_service
from app.services.voice.agent_bridge import VoiceAgentBridge
from app.services.voice.analytics import VoiceEvent, record_event
from app.services.voice.receptionist import intent_classifier
from app.services.voice.session import CallState, get_session_manager
from app.services.voice.stt import get_stt
from app.services.voice.tts import get_tts

log = logging.getLogger("app.voice.stream")

# ── VAD tuning ──
_FRAME_MS = 20                 # Twilio sends 20ms μ-law frames @ 8kHz (160 bytes)
_SILENCE_HANGOVER_MS = 450     # end utterance after this much trailing silence
_MIN_UTTERANCE_MS = 300        # ignore blips shorter than this
_MAX_UTTERANCE_MS = 15000      # force-flush very long utterances
_ENERGY_THRESHOLD = 500        # linear RMS above which a frame counts as speech

# ── Reply chunking (for streamed TTS) ──
_FRAME_BYTES = 160             # 20ms of μ-law @ 8kHz
_ULAW_SILENCE = 0xFF           # μ-law byte for silence (used to pad final frame)
_SENTENCE_END = re.compile(r"[.!?\u2026](?:\s|$)")
_CLAUSE_END = re.compile(r"[,;:](?:\s|$)")
_FIRST_CHUNK_MIN = 24          # min chars before the first chunk may flush on a clause
_FIRST_CHUNK_MAX = 70          # force-flush the first chunk past this many chars
_CHUNK_MAX = 220               # force-flush later chunks past this many chars


# μ-law → linear PCM (16-bit) decode table, built once.
def _build_ulaw_table() -> list[int]:
    table = []
    for i in range(256):
        u = ~i & 0xFF
        sign = u & 0x80
        exponent = (u >> 4) & 0x07
        mantissa = u & 0x0F
        sample = ((mantissa << 3) + 0x84) << exponent
        sample -= 0x84
        table.append(-sample if sign else sample)
    return table


_ULAW_TABLE = _build_ulaw_table()


def _frame_energy(mulaw: bytes) -> float:
    """RMS energy of a μ-law frame (decoded to linear PCM)."""
    if not mulaw:
        return 0.0
    total = 0
    for b in mulaw:
        s = _ULAW_TABLE[b]
        total += s * s
    return (total / len(mulaw)) ** 0.5


class MediaStreamHandler:
    """One instance per WebSocket connection / call."""

    def __init__(self, websocket: Any, *, session_id: Optional[str] = None,
                 call_id: Optional[str] = None) -> None:
        self.ws = websocket
        self.stream_sid: Optional[str] = None
        self.call_sid: Optional[str] = None
        self.session_id: Optional[str] = session_id
        self.call_id: Optional[uuid.UUID] = None
        if call_id:
            try:
                self.call_id = uuid.UUID(call_id)
            except ValueError:
                self.call_id = None
        self._closed = False
        self._buffer = bytearray()
        self._buffer_ms = 0
        self._silence_ms = 0
        self._in_speech = False
        self._processing = False
        self._sequence = 0
        self._mgr = get_session_manager()
        # Cached per-call TTS provider so its HTTP connection is reused across
        # turns (one TLS handshake instead of one per sentence).
        self._tts: Any = None
        self._tts_key: Optional[str] = None

    # ───────────────────────── lifecycle ─────────────────────────

    async def run(self) -> None:
        try:
            while not self._closed:
                raw = await self.ws.receive_text()
                msg = json.loads(raw)
                await self._dispatch(msg)
        except Exception as e:  # noqa: BLE001 — connection closed / parse error
            log.info("media stream closed: %s", e)
        finally:
            await self._finalize()

    async def _dispatch(self, msg: dict[str, Any]) -> None:
        event = msg.get("event")
        if event == "connected":
            return
        if event == "start":
            await self._on_start(msg.get("start", {}))
        elif event == "media":
            await self._on_media(msg.get("media", {}))
        elif event == "stop":
            self._closed = True
        elif event == "mark":
            return

    async def _on_start(self, start: dict[str, Any]) -> None:
        self.stream_sid = start.get("streamSid")
        self.call_sid = start.get("callSid")
        params = start.get("customParameters", {}) or {}
        # Twilio Media Streams may deliver our identifiers either as query-string
        # params (already captured at construction) or as <Parameter> tags. Only
        # override when the start event actually carries a value.
        if params.get("session_id"):
            self.session_id = params.get("session_id")
        if params.get("call_id"):
            try:
                self.call_id = uuid.UUID(params["call_id"])
            except ValueError:
                pass
        log.info("media stream started: call_sid=%s session=%s", self.call_sid, self.session_id)
        session = await self._mgr.get(self.session_id) if self.session_id else None
        if session:
            await self._mgr.set_state(session, CallState.listening)
        # Proactive opening line (primarily outbound — inbound greets via TwiML
        # <Say> before the stream connects).
        await self._greet(session)

    async def _greet(self, session: Any) -> None:
        """Speak the agent's opening line once, if one is queued on the session."""
        if not session:
            return
        meta = session.meta or {}
        greeting = (meta.get("greeting") or "").strip()
        if not greeting or meta.get("greeted"):
            return
        self._processing = True
        try:
            async with session_scope() as db:
                call = await self._load_call(db)
                profile = None
                if call is not None:
                    profile = await db.scalar(
                        select(VoiceProfile).where(VoiceProfile.agent_id == call.agent_id)
                    )
                await self._speak(greeting, profile)
                if call is not None:
                    await self._persist_message(db, call.id, SpeakerRole.agent, greeting)
                    await db.commit()
            session.add_turn("agent", greeting)
            session.meta["greeted"] = True
            await self._mgr.set_state(session, CallState.listening)
            await self._mgr.save(session)
        except Exception as e:  # noqa: BLE001 — greeting must not break the call
            log.warning("greeting playback failed: %s", e)
        finally:
            self._processing = False

    async def _on_media(self, media: dict[str, Any]) -> None:
        payload = media.get("payload")
        if not payload or self._processing:
            return
        try:
            chunk = base64.b64decode(payload)
        except Exception:
            return
        energy = _frame_energy(chunk)
        is_speech = energy >= _ENERGY_THRESHOLD

        if is_speech:
            self._in_speech = True
            self._silence_ms = 0
            self._buffer.extend(chunk)
            self._buffer_ms += _FRAME_MS
        elif self._in_speech:
            # trailing silence after speech — keep buffering until hangover
            self._buffer.extend(chunk)
            self._buffer_ms += _FRAME_MS
            self._silence_ms += _FRAME_MS

        end_of_utterance = self._in_speech and (
            self._silence_ms >= _SILENCE_HANGOVER_MS
            or self._buffer_ms >= _MAX_UTTERANCE_MS
        )
        if end_of_utterance and self._buffer_ms >= _MIN_UTTERANCE_MS:
            audio = bytes(self._buffer)
            self._buffer.clear()
            self._buffer_ms = 0
            self._silence_ms = 0
            self._in_speech = False
            asyncio.create_task(self._handle_utterance(audio))

    # ───────────────────────── turn handling ─────────────────────

    async def _handle_utterance(self, audio: bytes) -> None:
        if self._processing or self._closed:
            return
        self._processing = True
        t0 = time.time()
        try:
            async with session_scope() as db:
                call = await self._load_call(db)
                if call is None:
                    return
                profile = await db.scalar(
                    select(VoiceProfile).where(VoiceProfile.agent_id == call.agent_id)
                )
                # 1) STT
                stt = get_stt(profile.stt_provider if profile else None)
                transcript = await stt.transcribe(
                    audio,
                    encoding="mulaw",
                    sample_rate=8000,
                    language=(profile.language if profile else None),
                    model=(profile.stt_model if profile else None),
                )
                user_text = (transcript.text or "").strip()
                if not user_text:
                    return

                session = await self._mgr.get(self.session_id) if self.session_id else None
                await record_event(
                    db, organization_id=call.organization_id, event_type=VoiceEvent.transcript,
                    call_id=call.id, metadata={"text": user_text, "confidence": transcript.confidence},
                )
                await self._persist_message(
                    db, call.id, SpeakerRole.caller, user_text,
                    confidence=transcript.confidence, language=transcript.language,
                )
                if session:
                    session.add_turn("caller", user_text, confidence=transcript.confidence)
                    session.language = transcript.language or session.language
                    await self._mgr.set_state(session, CallState.thinking)

                # 2) Agent reply via existing runtime — STREAMED so the caller
                #    hears the first words within a few hundred ms instead of
                #    waiting for the whole reply + full TTS render to finish.
                agent = await db.scalar(
                    select(Agent)
                    .options(selectinload(Agent.config))
                    .where(Agent.id == call.agent_id)
                )
                if agent is None:
                    return
                ctx = self._org_ctx(call)
                bridge = VoiceAgentBridge(db, ctx)
                if session:
                    await self._mgr.set_state(session, CallState.speaking)

                reply_parts: list[str] = []
                ttfa_logged = False
                if session:
                    try:
                        async for sentence in self._iter_speakable(
                            bridge.respond_stream(agent, session, user_text)
                        ):
                            if self._closed:
                                break
                            reply_parts.append(sentence)
                            if not ttfa_logged:
                                log.info(
                                    "voice time-to-first-audio: %.0fms",
                                    (time.time() - t0) * 1000.0,
                                )
                                ttfa_logged = True
                            await self._speak_stream(sentence, profile)
                    except Exception as ge:  # noqa: BLE001 — never break the call
                        log.warning("streamed reply failed: %s", ge)

                reply_text = " ".join(p.strip() for p in reply_parts).strip()
                # Degraded-mode safety net: the agent must never go silent. If the
                # language model produced nothing (e.g. provider error / no session),
                # speak a polite holding line instead of dead air.
                if not reply_text:
                    reply_text = (
                        "I'm sorry, I'm having a little trouble with that right now. "
                        "Could you please repeat that, or I can take a message for you?"
                    )
                    await self._speak(reply_text, profile)
                latency_ms = (time.time() - t0) * 1000.0

                # 3) Persist + analytics AFTER audio is already playing — keep all
                #    DB work off the spoken-latency path.
                await self._persist_message(
                    db, call.id, SpeakerRole.agent, reply_text, latency_ms=latency_ms,
                )
                await record_event(
                    db, organization_id=call.organization_id, event_type=VoiceEvent.response,
                    call_id=call.id, metadata={"text": reply_text, "latency_ms": latency_ms},
                )
                if session:
                    session.add_turn("agent", reply_text, latency_ms=latency_ms)
                    session.tokens += max(1, len(reply_text) // 4)
                    await self._mgr.set_state(session, CallState.listening)
                await db.commit()


                # 4) Post-reply analytics (off the spoken-latency path): classify
                #    the caller's primary intent once and fire any bound workflows.
                if call.detected_intent is None:
                    try:
                        history = session.turns if session else None
                        intent_res = await intent_classifier.classify(user_text, history=history)
                        call.detected_intent = intent_res.intent
                        if intent_res.language and not call.detected_language:
                            call.detected_language = intent_res.language
                        await record_event(
                            db, organization_id=call.organization_id, event_type=VoiceEvent.intent,
                            call_id=call.id,
                            metadata={
                                "intent": intent_res.intent,
                                "confidence": intent_res.confidence,
                                "language": intent_res.language,
                            },
                        )
                        if session:
                            session.meta["intent"] = intent_res.intent
                        try:
                            from app.services.voice.workflow_triggers import evaluate_and_fire
                            if call.detected_intent:
                                await evaluate_and_fire(
                                    db, organization_id=call.organization_id, agent_id=call.agent_id,
                                    signal_type="intent", value=call.detected_intent,
                                    text=user_text, context={"call_id": str(call.id)},
                                )
                        except Exception as we:  # noqa: BLE001 — never break the call
                            log.warning("voice workflow trigger eval failed: %s", we)
                        await db.commit()
                    except Exception as ie:  # noqa: BLE001 — intent must not break the call
                        log.warning("intent classification failed: %s", ie)
        except Exception as e:  # noqa: BLE001
            log.warning("utterance handling failed: %s", e)
        finally:
            self._processing = False

    async def _speak(self, text: str, profile: Optional[VoiceProfile]) -> None:
        try:
            tts = get_tts(profile.provider if profile else None)
            result = await tts.synthesize(
                text,
                voice_id=(profile.voice_id if profile and profile.voice_id else None),
                model=(profile.model if profile else None),
                output_format="mulaw",
                sample_rate=8000,
                stability=(profile.stability if profile else 0.45),
                similarity_boost=(profile.similarity_boost if profile else 0.8),
                style=(profile.style if profile else 0.35),
                speed=(profile.speed if profile else 1.0),
            )
            if not result.audio or not self.stream_sid:
                return
            # Twilio media frames carry base64 μ-law; send in 160-byte (20ms) chunks.
            audio = result.audio
            for i in range(0, len(audio), 160):
                if self._closed:
                    return
                frame = audio[i : i + 160]
                await self.ws.send_text(json.dumps({
                    "event": "media",
                    "streamSid": self.stream_sid,
                    "media": {"payload": base64.b64encode(frame).decode("ascii")},
                }))
            await self.ws.send_text(json.dumps({
                "event": "mark",
                "streamSid": self.stream_sid,
                "mark": {"name": f"reply-{self._sequence}"},
            }))
        except Exception as e:  # noqa: BLE001
            log.warning("TTS playback failed: %s", e)

    def _get_tts(self, profile: Optional[VoiceProfile]):
        """Return a per-call TTS provider, cached so its HTTP client is reused."""
        key = (profile.provider if profile and profile.provider else "default")
        if self._tts is None or self._tts_key != key:
            self._tts = get_tts(profile.provider if profile else None)
            self._tts_key = key
        return self._tts

    async def _iter_speakable(self, pieces: AsyncIterator[str]) -> AsyncIterator[str]:
        """Group streamed LLM tokens into natural, speakable chunks.

        The first chunk is flushed aggressively (on the first sentence/clause
        boundary or a short length) to minimise time-to-first-audio; later
        chunks are larger so prosody stays natural.
        """
        buf = ""
        first = True
        async for piece in pieces:
            if not piece:
                continue
            buf += piece
            while True:
                cut = self._find_cut(buf, first)
                if cut <= 0:
                    break
                chunk = buf[:cut].strip()
                buf = buf[cut:]
                if chunk:
                    first = False
                    yield chunk
        tail = buf.strip()
        if tail:
            yield tail

    @staticmethod
    def _find_cut(buf: str, first: bool) -> int:
        """Index at which to split ``buf`` into a speakable chunk, or -1."""
        m = _SENTENCE_END.search(buf)
        if m:
            return m.end()
        if first:
            cm = _CLAUSE_END.search(buf)
            if cm and cm.end() >= _FIRST_CHUNK_MIN:
                return cm.end()
            if len(buf) >= _FIRST_CHUNK_MAX:
                sp = buf.rfind(" ", 0, _FIRST_CHUNK_MAX)
                return sp + 1 if sp > 0 else _FIRST_CHUNK_MAX
            return -1
        if len(buf) >= _CHUNK_MAX:
            sp = buf.rfind(" ", 0, _CHUNK_MAX)
            return sp + 1 if sp > 0 else _CHUNK_MAX
        return -1

    async def _speak_stream(self, text: str, profile: Optional[VoiceProfile]) -> None:
        """Synthesize ``text`` and stream μ-law frames to Twilio as they arrive."""
        if not text or self._closed or not self.stream_sid:
            return
        tts = self._get_tts(profile)
        leftover = b""
        try:
            async for audio in tts.synthesize_stream(
                text,
                voice_id=(profile.voice_id if profile and profile.voice_id else None),
                model=(profile.model if profile else None),
                output_format="mulaw",
                sample_rate=8000,
                stability=(profile.stability if profile else 0.45),
                similarity_boost=(profile.similarity_boost if profile else 0.8),
                style=(profile.style if profile else 0.35),
                speed=(profile.speed if profile else 1.0),
            ):
                if self._closed:
                    return
                if not audio:
                    continue
                data = leftover + audio
                n = (len(data) // _FRAME_BYTES) * _FRAME_BYTES
                for i in range(0, n, _FRAME_BYTES):
                    if self._closed:
                        return
                    frame = data[i : i + _FRAME_BYTES]
                    await self.ws.send_text(json.dumps({
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "media": {"payload": base64.b64encode(frame).decode("ascii")},
                    }))
                leftover = data[n:]
            # Pad and flush the final partial frame with μ-law silence.
            if leftover and not self._closed:
                frame = leftover + bytes([_ULAW_SILENCE]) * (_FRAME_BYTES - len(leftover))
                await self.ws.send_text(json.dumps({
                    "event": "media",
                    "streamSid": self.stream_sid,
                    "media": {"payload": base64.b64encode(frame).decode("ascii")},
                }))
            self._sequence += 1
            await self.ws.send_text(json.dumps({
                "event": "mark",
                "streamSid": self.stream_sid,
                "mark": {"name": f"reply-{self._sequence}"},
            }))
        except Exception as e:  # noqa: BLE001 — playback must never crash the call
            log.warning("streamed TTS playback failed: %s", e)


    async def _load_call(self, db) -> Optional[VoiceCall]:
        if self.call_id:
            return await db.scalar(select(VoiceCall).where(VoiceCall.id == self.call_id))
        if self.call_sid:
            return await db.scalar(
                select(VoiceCall).where(VoiceCall.provider_call_sid == self.call_sid)
            )
        return None

    async def _persist_message(self, db, call_id, speaker, text, *, confidence=0.0,
                              latency_ms=None, language=None) -> None:
        self._sequence += 1
        db.add(VoiceMessage(
            call_id=call_id,
            sequence=self._sequence,
            speaker=speaker,
            text=text,
            confidence=confidence,
            latency_ms=latency_ms,
            language=language,
            is_final=True,
        ))

    @staticmethod
    def _org_ctx(call: VoiceCall) -> OrgContext:
        return OrgContext(
            user_id=call.organization_id,  # placeholder actor for system-initiated turns
            cognito_sub="",
            organization_id=call.organization_id,
            membership_role="owner",
        )

    async def _flush_visitor_memory(self, db, call: VoiceCall, session) -> None:
        """Persist the call's highlights onto the shared VisitorProfile so the
        SAME identity carries forward to the website chat and future calls.

        Resolves the profile by phone (or the id stashed at call start), appends
        the first/last meaningful turns to the rolling cross-channel memory and
        bumps the conversation rollups. Memory must never break call teardown.
        """
        try:
            profile = None
            pid = (session.meta or {}).get("visitor_profile_id")
            if pid:
                from app.database.models.visitor_profile import VisitorProfile

                profile = await db.get(VisitorProfile, uuid.UUID(str(pid)))
            if profile is None:
                profile = await visitor_service.upsert_profile(
                    db,
                    organization_id=call.organization_id,
                    visitor_key=visitor_service.normalize_phone(call.caller_number)
                    or f"call_{call.id}",
                    channel="voice",
                    phone=call.caller_number,
                )

            # Keep memory compact: the caller's first ask and the last exchange.
            turns = [t for t in (session.turns or []) if (t.get("text") or "").strip()]
            picks: list[dict] = []
            first_caller = next((t for t in turns if t.get("speaker") == "caller"), None)
            if first_caller is not None:
                picks.append(first_caller)
            for t in turns[-2:]:
                if t not in picks:
                    picks.append(t)
            for t in picks:
                role = "user" if t.get("speaker") == "caller" else "assistant"
                visitor_service.append_memory(
                    profile, channel="voice", role=role, text=t.get("text") or ""
                )

            used = list(profile.channels_used or [])
            if "voice" not in used:
                profile.channels_used = used + ["voice"]
            profile.conversation_count = (profile.conversation_count or 0) + 1
            profile.last_channel = "voice"
            profile.last_seen_at = datetime.now(timezone.utc)
        except Exception as e:  # noqa: BLE001 — never break call teardown
            log.info("visitor memory flush skipped: %s", e)

    async def _finalize(self) -> None:
        try:
            async with session_scope() as db:
                call = await self._load_call(db)
                if call and call.status not in CallStatus.TERMINAL:
                    call.status = CallStatus.completed
                    call.transcript_status = TranscriptStatus.completed
                    if self.session_id:
                        session = await self._mgr.get(self.session_id)
                        if session:
                            call.duration_seconds = session.duration_seconds
                            call.avg_latency_ms = session.avg_latency_ms
                            call.tokens = session.tokens
                            call.interruptions = session.interruptions
                            await self._flush_visitor_memory(db, call, session)
                    if call.ended_at is None:
                        call.ended_at = datetime.now(timezone.utc)
                    await record_event(
                        db, organization_id=call.organization_id,
                        event_type=VoiceEvent.call_ended, call_id=call.id,
                        metadata={"duration": call.duration_seconds},
                    )
                    await db.commit()
            if self.session_id:
                session = await self._mgr.get(self.session_id)
                if session:
                    await self._mgr.set_state(session, CallState.ended)
        except Exception as e:  # noqa: BLE001
            log.info("finalize skipped: %s", e)
        finally:
            # Release the cached TTS HTTP client (persistent keep-alive pool).
            if self._tts is not None:
                try:
                    await self._tts.aclose()
                except Exception:  # noqa: BLE001
                    pass
                self._tts = None
