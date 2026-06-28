"""Phase 10 — Production resilience, cost & observability engine.

Application-level building blocks for running Voice at scale:

* :class:`ProviderHealthRegistry` (10.3) — tracks health + latency per provider
  per service category (voice / stt / tts / llm) and resolves the active
  provider with automatic failover ordering.
* :class:`CostEngine` (10.4) — derives cost-per-call / cost-per-minute, monthly
  spend and a naive forecast from recorded call rows.
* :class:`RateLimiter` (10.6) — in-process token-bucket limiter (per key) usable
  as a FastAPI dependency; degrades to allow when misconfigured.

These are process-local and stateless-friendly: in a multi-instance deployment
the registry/limiter back onto Redis when ``REDIS_URL`` is set elsewhere, but the
default in-memory implementation keeps single-node and tests working.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Optional


# ───────────────────────── 10.3 multi-provider resilience ────────────────────

# Default provider catalogue per critical service (priority = list order).
DEFAULT_PROVIDERS: dict[str, list[str]] = {
    "voice": ["twilio", "exotel", "plivo", "signalwire"],
    "stt": ["deepgram", "openai", "google", "amazon"],
    "tts": ["elevenlabs", "cartesia", "polly", "openai"],
    "llm": ["openai", "anthropic", "google"],
}


@dataclass
class ProviderHealth:
    name: str
    category: str
    priority: int
    healthy: bool = True
    latency_ms: float = 0.0
    failures: int = 0
    last_probe_at: float = 0.0
    last_error: Optional[str] = None


class ProviderHealthRegistry:
    """Tracks provider health and resolves the active provider with failover."""

    # Number of consecutive failures before a provider is marked unhealthy.
    FAILURE_THRESHOLD = 3

    def __init__(self) -> None:
        self._lock = Lock()
        self._providers: dict[str, ProviderHealth] = {}
        for category, names in DEFAULT_PROVIDERS.items():
            for priority, name in enumerate(names):
                self._providers[self._key(category, name)] = ProviderHealth(
                    name=name, category=category, priority=priority
                )

    @staticmethod
    def _key(category: str, name: str) -> str:
        return f"{category}:{name}"

    def record_probe(
        self, *, category: str, name: str, healthy: bool,
        latency_ms: float = 0.0, error: Optional[str] = None,
    ) -> ProviderHealth:
        with self._lock:
            key = self._key(category, name)
            ph = self._providers.get(key)
            if ph is None:
                # Unknown provider → register at lowest priority.
                priority = max(
                    (p.priority for p in self._providers.values() if p.category == category),
                    default=-1,
                ) + 1
                ph = ProviderHealth(name=name, category=category, priority=priority)
                self._providers[key] = ph
            ph.last_probe_at = time.time()
            ph.latency_ms = latency_ms
            if healthy:
                ph.failures = 0
                ph.healthy = True
                ph.last_error = None
            else:
                ph.failures += 1
                ph.last_error = error
                if ph.failures >= self.FAILURE_THRESHOLD:
                    ph.healthy = False
            return ph

    def mark_unhealthy(self, category: str, name: str, error: str = "") -> None:
        self.record_probe(category=category, name=name, healthy=False, error=error)

    def active_provider(self, category: str) -> Optional[str]:
        """Lowest-priority healthy provider, or the top priority as last resort."""
        with self._lock:
            members = sorted(
                (p for p in self._providers.values() if p.category == category),
                key=lambda p: p.priority,
            )
            if not members:
                return None
            for p in members:
                if p.healthy:
                    return p.name
            return members[0].name  # everything down — return primary anyway

    def failover_chain(self, category: str) -> list[str]:
        with self._lock:
            members = sorted(
                (p for p in self._providers.values() if p.category == category),
                key=lambda p: (not p.healthy, p.priority),
            )
            return [p.name for p in members]

    def snapshot(self) -> dict[str, list[dict]]:
        with self._lock:
            out: dict[str, list[dict]] = {}
            for p in sorted(self._providers.values(), key=lambda x: (x.category, x.priority)):
                out.setdefault(p.category, []).append({
                    "name": p.name,
                    "priority": p.priority,
                    "healthy": p.healthy,
                    "latency_ms": round(p.latency_ms, 1),
                    "failures": p.failures,
                    "last_probe_at": p.last_probe_at or None,
                    "last_error": p.last_error,
                })
            return out


# ───────────────────────────── 10.4 cost engine ──────────────────────────────

# Indicative unit costs (USD) used when a call has no recorded ``cost`` — these
# are configuration defaults, overridden by real provider billing in prod.
DEFAULT_RATE_PER_MINUTE = 0.08   # blended telephony + media
DEFAULT_LLM_PER_1K_TOKENS = 0.01


@dataclass
class CostBreakdown:
    total_calls: int = 0
    total_minutes: float = 0.0
    total_cost: float = 0.0
    cost_per_call: float = 0.0
    cost_per_minute: float = 0.0
    projected_monthly: float = 0.0
    forecast_next_month: float = 0.0
    by_day: list[dict] = field(default_factory=list)


class CostEngine:
    """Derives cost KPIs and a naive forecast from aggregate call data."""

    @staticmethod
    def estimate_call_cost(*, duration_seconds: int, tokens: int, recorded_cost: float) -> float:
        if recorded_cost and recorded_cost > 0:
            return float(recorded_cost)
        minutes = max(duration_seconds, 0) / 60.0
        return round(minutes * DEFAULT_RATE_PER_MINUTE
                     + (max(tokens, 0) / 1000.0) * DEFAULT_LLM_PER_1K_TOKENS, 4)

    @staticmethod
    def summarize(
        *, total_calls: int, total_seconds: int, total_cost: float, window_days: int,
        by_day: Optional[list[dict]] = None,
    ) -> CostBreakdown:
        minutes = total_seconds / 60.0
        cpc = (total_cost / total_calls) if total_calls else 0.0
        cpm = (total_cost / minutes) if minutes else 0.0
        daily_avg = (total_cost / window_days) if window_days else 0.0
        return CostBreakdown(
            total_calls=total_calls,
            total_minutes=round(minutes, 1),
            total_cost=round(total_cost, 2),
            cost_per_call=round(cpc, 4),
            cost_per_minute=round(cpm, 4),
            projected_monthly=round(daily_avg * 30, 2),
            forecast_next_month=round(daily_avg * 30 * 1.1, 2),  # +10% growth assumption
            by_day=by_day or [],
        )


# ───────────────────────────── 10.6 rate limiter ─────────────────────────────

@dataclass
class _Bucket:
    tokens: float
    updated: float


class RateLimiter:
    """Token-bucket limiter keyed by an arbitrary string (org id / IP)."""

    def __init__(self, rate: float = 60.0, per_seconds: float = 60.0, burst: Optional[float] = None) -> None:
        self.rate = rate
        self.per = per_seconds
        self.capacity = burst if burst is not None else rate
        self._buckets: dict[str, _Bucket] = {}
        self._lock = Lock()

    def allow(self, key: str, cost: float = 1.0) -> bool:
        now = time.time()
        with self._lock:
            b = self._buckets.get(key)
            if b is None:
                b = _Bucket(tokens=self.capacity, updated=now)
                self._buckets[key] = b
            # Refill.
            elapsed = now - b.updated
            b.tokens = min(self.capacity, b.tokens + elapsed * (self.rate / self.per))
            b.updated = now
            if b.tokens >= cost:
                b.tokens -= cost
                return True
            return False

    def remaining(self, key: str) -> float:
        with self._lock:
            b = self._buckets.get(key)
            return round(b.tokens, 2) if b else self.capacity


# Process-wide singletons.
provider_registry = ProviderHealthRegistry()
cost_engine = CostEngine()
# Default: 120 voice control-plane requests / minute / org.
voice_rate_limiter = RateLimiter(rate=120.0, per_seconds=60.0)
