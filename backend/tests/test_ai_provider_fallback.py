"""Multi-provider AI resilience — when every model in the routed chain
fails (provider outage, not just one model), the runtime must degrade to
MockProvider rather than hard-failing the chat turn."""
from __future__ import annotations

import pytest

from app.providers.base import AIProviderError, ChatMessage


class _AlwaysFailsProvider:
    """Simulates a fully-down AI provider (e.g. network outage, revoked key)."""

    async def chat(self, messages, *, model, temperature=0.7, max_tokens=1024):
        raise AIProviderError("simulated provider outage", code="network")


@pytest.mark.asyncio
async def test_generate_reply_degrades_to_mock_when_provider_exhausted(monkeypatch):
    from app.services import agent_runtime as runtime_module

    runtime = object.__new__(runtime_module.AgentRuntime)
    runtime.provider = _AlwaysFailsProvider()
    runtime.session = None
    runtime.ctx = None

    def _fake_model_params(agent):
        return "openai/gpt-5.5", 0.7, 100

    async def _fake_route_chain(model):
        return [model]  # single-model chain, all of which fail

    monkeypatch.setattr(runtime, "_model_params", _fake_model_params)
    monkeypatch.setattr(runtime, "_route_chain", _fake_route_chain)

    result = await runtime.generate_reply(agent=None, messages=[ChatMessage(role="user", content="hi")])

    assert result.model == "mock-fallback"
    assert result.content  # MockProvider always returns deterministic non-empty text
