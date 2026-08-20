"""AI provider package (Phase 8).

Exposes the provider contract plus a tiny factory that selects the right
backend from environment configuration. Importing this package is cheap
and side-effect free.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache

from app.providers.base import (
    AIProvider,
    AIProviderError,
    AIResponse,
    ChatMessage,
    TokenUsage,
    estimate_tokens,
)
from app.providers.mock_provider import MockProvider

log = logging.getLogger("app.providers")

#: Default model. Overridable via ``OPENAI_MODEL``.
DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "openai/gpt-5.5")


@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    """Return the active AI provider.

    Selection rules:
      * ``OPENAI_API_KEY`` present  → :class:`OpenAIProvider`
      * otherwise                   → :class:`MockProvider`

    The result is cached for the process; tests can clear it via
    ``get_provider.cache_clear()``.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            from app.providers.openai_provider import OpenAIProvider

            base_url = os.environ.get("OPENAI_BASE_URL", "").strip() or None
            log.info(
                "AI provider: openai (model=%s, base_url=%s)",
                DEFAULT_MODEL,
                base_url or "default",
            )
            return OpenAIProvider(api_key, base_url=base_url)
        except Exception as e:  # pragma: no cover - defensive
            log.warning("OpenAI provider init failed (%s); falling back to mock.", e)
    log.info("AI provider: mock (no OPENAI_API_KEY configured)")
    return MockProvider()


__all__ = [
    "AIProvider",
    "AIProviderError",
    "AIResponse",
    "ChatMessage",
    "TokenUsage",
    "MockProvider",
    "DEFAULT_MODEL",
    "get_provider",
    "estimate_tokens",
]
