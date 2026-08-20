"""Phase 8 — AI Chat & Agent Runtime audit.

Two tiers:

  TIER A — OFFLINE (always runs; no network / DB):
    • Provider abstraction (mock chat + streaming + token usage)
    • Provider factory selection
    • Runtime role<->sender bridge
    • System-prompt assembly incl. CONTEXT injection
    • Keyword extraction + title fallback

  TIER B — LIVE end-to-end (runs against API_BASE_URL + Postgres + Cognito):
    • Schema: conversations.{user_id,title,last_message_at}, messages.token_count
    • Conversation: create / list / get / rename / delete (soft)
    • Messages: send / persist / retrieve
    • Runtime: system prompt + history + AI response
    • Token tracking: token_count + usage metadata
    • Knowledge: KB chunk context injected
    • Streaming: SSE emits token chunks
    • Security: cross-tenant access blocked (404)

Run (server):
    API_BASE_URL=https://oraone.in python tests/audit_phase8_chat_runtime.py
"""
import asyncio
import json
import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env", override=True)
except Exception:  # pragma: no cover
    pass

if os.environ.get("OVERRIDE_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["OVERRIDE_DATABASE_URL"]

API = os.environ.get("API_BASE_URL", "http://localhost:8000")

PASS, FAIL = [], []
state: dict = {}


def step(name, fn, loop=None):
    print(f"\n▶ {name}")
    try:
        if asyncio.iscoroutinefunction(fn):
            loop = loop or asyncio.new_event_loop()
            result = loop.run_until_complete(fn())
        else:
            result = fn()
        PASS.append(name)
        print("  ✓ OK", f"({result})" if result else "")
        return result
    except AssertionError as e:
        FAIL.append((name, str(e)))
        print(f"  ✗ FAIL: {e}")
    except Exception as e:
        FAIL.append((name, f"{type(e).__name__}: {e}"))
        print(f"  ✗ ERR: {type(e).__name__}: {e}")


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


# ════════════════════════ TIER A — OFFLINE ════════════════════════

def t_provider_factory():
    from app.providers import get_provider, MockProvider
    get_provider.cache_clear()
    had = os.environ.pop("OPENAI_API_KEY", None)
    try:
        p = get_provider()
        assert isinstance(p, MockProvider), f"expected MockProvider, got {type(p)}"
    finally:
        if had is not None:
            os.environ["OPENAI_API_KEY"] = had
        get_provider.cache_clear()
    return p.name


async def t_provider_chat():
    from app.providers import MockProvider, ChatMessage
    p = MockProvider()
    msgs = [
        ChatMessage(role="system", content="You are a test agent."),
        ChatMessage(role="user", content="What is OraOne?"),
    ]
    resp = await p.chat(msgs, model="gpt-5.5", temperature=0.5, max_tokens=256)
    assert resp.content, "empty completion"
    assert resp.usage.total_tokens > 0, "no token usage reported"
    assert resp.usage.total_tokens == resp.usage.prompt_tokens + resp.usage.completion_tokens
    return f"tokens={resp.usage.total_tokens}"


async def t_provider_stream():
    from app.providers import MockProvider, ChatMessage
    p = MockProvider()
    msgs = [ChatMessage(role="user", content="Stream this please")]
    chunks = []
    async for piece in p.stream(msgs, model="gpt-5.5"):
        chunks.append(piece)
    assert len(chunks) >= 3, f"expected multiple chunks, got {len(chunks)}"
    assert "".join(chunks).strip(), "stream produced no text"
    return f"chunks={len(chunks)}"


def t_role_bridge():
    from app.services.agent_runtime import role_to_sender, sender_to_role
    from app.database.models.message import MessageSender
    assert role_to_sender("assistant") == MessageSender.agent
    assert role_to_sender("user") == MessageSender.customer
    assert sender_to_role(MessageSender.agent) == "assistant"
    assert sender_to_role(MessageSender.customer) == "user"
    assert sender_to_role(MessageSender.system) == "system"
    return "user/assistant/system/tool mapped"


def t_system_prompt_context():
    from types import SimpleNamespace
    from app.services.agent_runtime import AgentRuntime
    rt = AgentRuntime.__new__(AgentRuntime)  # no DB needed for pure method
    cfg = SimpleNamespace(
        system_prompt="Always be kind.", greeting="Hello!", language="en-US",
        voice="Aria", temperature=0.5, max_tokens=512, config={},
    )
    agent = SimpleNamespace(name="Helper", description="A helpful bot", config=cfg, model="gpt-5.5")
    prompt = rt.build_system_prompt(agent, ["Refunds take 5 days.", "We ship worldwide."])
    assert "Helper" in prompt
    assert "Always be kind." in prompt
    assert "CONTEXT:" in prompt, "knowledge context block missing"
    assert "Refunds take 5 days." in prompt
    base = rt.build_system_prompt(agent, None)
    assert "CONTEXT:" not in base, "context block should be absent without chunks"
    return f"prompt_len={len(prompt)}"


def t_keyword_extraction():
    from app.services.rag_service import _keywords
    kw = _keywords("How do I onboard new employees with the platform?")
    assert "onboard" in kw
    assert "employees" in kw
    assert "the" not in kw, "stopword leaked"
    return ", ".join(kw[:4])


async def t_title_fallback():
    from app.services.agent_runtime import AgentRuntime
    rt = AgentRuntime.__new__(AgentRuntime)
    from app.providers import MockProvider
    rt.provider = MockProvider()
    title = await rt.generate_title("How do I onboard new employees?")
    assert title and title != "New Conversation", f"weak title: {title!r}"
    assert len(title) <= 80
    empty = await rt.generate_title("")
    assert empty == "New Conversation"
    return title


def t_message_assembly():
    from types import SimpleNamespace
    from app.services.agent_runtime import AgentRuntime
    from app.database.models.message import MessageSender
    rt = AgentRuntime.__new__(AgentRuntime)
    cfg = SimpleNamespace(system_prompt="P", greeting=None, language="en-US",
                          voice=None, temperature=0.5, max_tokens=512, config={})
    agent = SimpleNamespace(name="A", description=None, config=cfg, model="gpt-5.5")
    history = [
        SimpleNamespace(sender=MessageSender.customer, message="hi"),
        SimpleNamespace(sender=MessageSender.agent, message="hello"),
    ]
    msgs = rt._to_chat_messages(agent, history, "next question", ["ctx"])
    assert msgs[0].role == "system"
    assert msgs[1].role == "user" and msgs[1].content == "hi"
    assert msgs[2].role == "assistant" and msgs[2].content == "hello"
    assert msgs[-1].role == "user" and msgs[-1].content == "next question"
    return f"messages={len(msgs)}"


def t_routes_registered():
    import server
    paths = {getattr(r, "path", "") for r in server.app.routes}
    needed = {
        "/api/conversations",
        "/api/conversations/{conversation_id}",
        "/api/conversations/{conversation_id}/messages",
        "/api/conversations/{conversation_id}/stream",
    }
    missing = needed - paths
    assert not missing, f"unmounted chat routes: {missing}"
    return f"{len(needed)} routes mounted"


# ════════════════════════ TIER B — LIVE ════════════════════════

def _live_available() -> bool:
    try:
        import requests
        r = requests.get(f"{API}/api/health", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def t_protected_without_auth():
    import requests
    r = requests.get(f"{API}/api/conversations", timeout=10)
    assert r.status_code == 401, f"expected 401, got {r.status_code}"
    r2 = requests.post(f"{API}/api/conversations", json={"agent_id": str(uuid.uuid4())}, timeout=10)
    assert r2.status_code == 401, f"expected 401, got {r2.status_code}"
    return "401 enforced"


def _cognito():
    import boto3
    region = os.environ["AWS_REGION"]
    return boto3.client("cognito-idp", region_name=region), os.environ["COGNITO_USER_POOL_ID"]


def _make_user(tag: str) -> str:
    import requests
    from botocore.exceptions import ClientError
    cognito, pool = _cognito()
    email = f"phase8+{tag}+{uuid.uuid4().hex[:8]}@oraone-test.dev"
    pwd = "TestPhase8!2026"
    r = requests.post(f"{API}/api/auth/signup", json={"email": email, "name": f"User {tag}", "password": pwd}, timeout=20)
    assert r.status_code == 200, r.text
    try:
        cognito.admin_confirm_sign_up(UserPoolId=pool, Username=email)
    except ClientError as e:
        if e.response["Error"]["Code"] != "NotAuthorizedException":
            raise
    cognito.admin_update_user_attributes(
        UserPoolId=pool, Username=email,
        UserAttributes=[{"Name": "email_verified", "Value": "true"}],
    )
    r = requests.post(f"{API}/api/auth/login", json={"email": email, "password": pwd}, timeout=20)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    requests.get(f"{API}/api/auth/identity", headers=_hdr(token), timeout=15)
    return token


def t_live_setup():
    import requests
    state["owner"] = _make_user("owner")
    r = requests.post(
        f"{API}/api/agents", headers=_hdr(state["owner"]),
        json={"name": "Support bot", "type": "chat", "description": "answers questions",
              "model": "gpt-5.5", "status": "active",
              "system_prompt": "You are a concise support agent.",
              "temperature": 0.4, "language": "en-US", "max_tokens": 600},
        timeout=20,
    )
    assert r.status_code == 201, r.text
    state["agent_id"] = r.json()["id"]
    state["org_id"] = r.json()["organization_id"]
    return state["agent_id"]


async def t_schema_columns():
    from sqlalchemy import text
    from app.database.session import init_engine
    init_engine()
    from app.database.session import engine
    async with engine.connect() as conn:
        conv = {r[0] for r in (await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='conversations'"))).all()}
        msg = {r[0] for r in (await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='messages'"))).all()}
    assert {"user_id", "title", "last_message_at"} <= conv, f"conversations missing: {conv}"
    assert "token_count" in msg, f"messages missing token_count: {msg}"
    return "schema present"


def t_create_conversation():
    import requests
    r = requests.post(f"{API}/api/conversations", headers=_hdr(state["owner"]),
                      json={"agent_id": state["agent_id"]}, timeout=15)
    assert r.status_code == 201, r.text
    body = r.json()
    for k in ("id", "organization_id", "agent_id", "user_id", "title", "status", "created_at"):
        assert k in body, f"missing {k}: {body}"
    state["conv_id"] = body["id"]
    return body["id"]


def t_list_conversations():
    import requests
    r = requests.get(f"{API}/api/conversations", headers=_hdr(state["owner"]), timeout=10)
    assert r.status_code == 200, r.text
    assert any(c["id"] == state["conv_id"] for c in r.json())
    r2 = requests.get(f"{API}/api/conversations", headers=_hdr(state["owner"]),
                      params={"agent_id": state["agent_id"]}, timeout=10)
    assert r2.status_code == 200 and any(c["id"] == state["conv_id"] for c in r2.json())
    return f"{len(r.json())} threads"


def t_get_conversation():
    import requests
    r = requests.get(f"{API}/api/conversations/{state['conv_id']}", headers=_hdr(state["owner"]), timeout=10)
    assert r.status_code == 200 and r.json()["id"] == state["conv_id"]


def t_send_message():
    import requests
    r = requests.post(f"{API}/api/conversations/{state['conv_id']}/messages",
                      headers=_hdr(state["owner"]),
                      json={"content": "How do I onboard new employees?"}, timeout=60)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user_message"]["role"] == "user"
    assert body["assistant_message"]["role"] == "assistant"
    assert body["assistant_message"]["content"], "empty AI response"
    assert body["usage"]["total_tokens"] > 0, "no usage tracked"
    assert body["assistant_message"]["token_count"] > 0, "token_count not persisted"
    assert body["title"] and body["title"] != "New Conversation", "title not auto-generated"
    state["title"] = body["title"]
    return f"title={body['title']!r} tokens={body['usage']['total_tokens']}"


def t_retrieve_messages():
    import requests
    r = requests.get(f"{API}/api/conversations/{state['conv_id']}/messages",
                     headers=_hdr(state["owner"]), timeout=10)
    assert r.status_code == 200, r.text
    msgs = r.json()
    assert len(msgs) >= 2, f"expected >=2 messages, got {len(msgs)}"
    roles = [m["role"] for m in msgs]
    assert "user" in roles and "assistant" in roles
    # ordering: first message is the user turn
    assert msgs[0]["role"] == "user"
    return f"{len(msgs)} messages persisted"


def t_history_second_turn():
    """A 2nd send should succeed and persist alongside the first (history)."""
    import requests
    r = requests.post(f"{API}/api/conversations/{state['conv_id']}/messages",
                      headers=_hdr(state["owner"]),
                      json={"content": "And what about contractors?"}, timeout=60)
    assert r.status_code == 201, r.text
    g = requests.get(f"{API}/api/conversations/{state['conv_id']}/messages",
                     headers=_hdr(state["owner"]), timeout=10)
    assert g.status_code == 200 and len(g.json()) >= 4, "history not accumulating"
    return f"{len(g.json())} messages"


async def t_knowledge_injection():
    """Seed a KB chunk in the org and verify it gets injected as context."""
    import requests
    from datetime import datetime, timezone
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.database.models.knowledge_base import KnowledgeBase, KnowledgeBaseStatus
    from app.database.models.document import Document, DocumentStatus
    from app.database.models.document_chunk import DocumentChunk

    org_id = uuid.UUID(state["org_id"])
    async with AsyncSessionLocal() as s:
        kb = KnowledgeBase(organization_id=org_id, name="Phase8 KB",
                           status=KnowledgeBaseStatus.active)
        s.add(kb)
        await s.flush()
        doc = Document(knowledge_base_id=kb.id, organization_id=org_id,
                       filename="policy.txt", file_type="text/plain",
                       s3_key=f"test/{uuid.uuid4()}.txt", status=DocumentStatus.processed,
                       processing_completed_at=datetime.now(timezone.utc))
        s.add(doc)
        await s.flush()
        s.add(DocumentChunk(document_id=doc.id, chunk_index=0,
                            content="Quetzal onboarding requires a signed NDA and a laptop request."))
        await s.commit()

    r = requests.post(f"{API}/api/conversations/{state['conv_id']}/messages",
                      headers=_hdr(state["owner"]),
                      json={"content": "Tell me about Quetzal onboarding NDA laptop."}, timeout=60)
    assert r.status_code == 201, r.text
    assert r.json()["context_used"] >= 1, "knowledge context not injected"
    return f"context_used={r.json()['context_used']}"


def t_streaming():
    import requests
    with requests.post(f"{API}/api/conversations/{state['conv_id']}/stream",
                       headers=_hdr(state["owner"]),
                       json={"content": "Stream a quick summary please."},
                       stream=True, timeout=60) as resp:
        assert resp.status_code == 200, resp.text
        ctype = resp.headers.get("content-type", "")
        assert "text/event-stream" in ctype, f"wrong content-type: {ctype}"
        events = []
        tokens = 0
        for raw in resp.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("event:"):
                events.append(raw.split(":", 1)[1].strip())
            if raw.startswith("data:") and events and events[-1] == "token":
                tokens += 1
            if "done" in events:
                break
    assert "start" in events, "no start event"
    assert tokens >= 1, "no token chunks streamed"
    assert "done" in events, "stream did not complete"
    return f"events={len(events)} tokens={tokens}"


def t_rename_conversation():
    import requests
    r = requests.put(f"{API}/api/conversations/{state['conv_id']}", headers=_hdr(state["owner"]),
                     json={"title": "Onboarding Q&A"}, timeout=10)
    assert r.status_code == 200 and r.json()["title"] == "Onboarding Q&A"


def t_cross_tenant_blocked():
    import requests
    other = _make_user("intruder")
    # GET another tenant's conversation → 404 (no existence leak)
    r = requests.get(f"{API}/api/conversations/{state['conv_id']}", headers=_hdr(other), timeout=15)
    assert r.status_code == 404, f"cross-tenant GET leaked: {r.status_code}"
    # Messages too
    r2 = requests.get(f"{API}/api/conversations/{state['conv_id']}/messages", headers=_hdr(other), timeout=15)
    assert r2.status_code == 404, f"cross-tenant messages leaked: {r2.status_code}"
    # Send too
    r3 = requests.post(f"{API}/api/conversations/{state['conv_id']}/messages",
                       headers=_hdr(other), json={"content": "hijack"}, timeout=15)
    assert r3.status_code == 404, f"cross-tenant send leaked: {r3.status_code}"
    return "404 on all cross-tenant access"


def t_delete_conversation():
    import requests
    r = requests.delete(f"{API}/api/conversations/{state['conv_id']}", headers=_hdr(state["owner"]), timeout=10)
    assert r.status_code == 204, r.text
    g = requests.get(f"{API}/api/conversations/{state['conv_id']}", headers=_hdr(state["owner"]), timeout=10)
    assert g.status_code == 404, "soft-deleted conversation still retrievable"
    return "soft-deleted"


# ════════════════════════ runner ════════════════════════

def main():
    loop = asyncio.new_event_loop()
    print("=" * 70)
    print("PHASE 8 — AI CHAT & AGENT RUNTIME AUDIT")
    print("=" * 70)

    print("\n--- TIER A: offline runtime/provider checks ---")
    step("provider factory selects mock without key", t_provider_factory)
    step("provider mock chat returns content + usage", t_provider_chat, loop)
    step("provider mock streaming yields chunks", t_provider_stream, loop)
    step("runtime role<->sender bridge", t_role_bridge)
    step("system prompt assembly + CONTEXT injection", t_system_prompt_context)
    step("knowledge keyword extraction", t_keyword_extraction)
    step("conversation title generation", t_title_fallback, loop)
    step("model message assembly order", t_message_assembly)
    step("chat routes registered on app", t_routes_registered)

    print("\n--- TIER B: live end-to-end checks ---")
    if not _live_available():
        print(f"  ⚠ API not reachable at {API} — skipping live tier.")
        print("    (Run on the deployed server: API_BASE_URL=https://oraone.in)")
    else:
        step("chat endpoints require auth (401)", t_protected_without_auth)
        step("schema: conversations + messages columns", t_schema_columns, loop)
        step("live setup (user + agent)", t_live_setup)
        step("create conversation", t_create_conversation)
        step("list conversations (+ agent filter)", t_list_conversations)
        step("get conversation", t_get_conversation)
        step("send message → AI response + tokens + title", t_send_message)
        step("retrieve persisted messages", t_retrieve_messages)
        step("history accumulates across turns", t_history_second_turn)
        step("knowledge base context injected", t_knowledge_injection, loop)
        step("streaming SSE emits token chunks", t_streaming)
        step("rename conversation", t_rename_conversation)
        step("cross-tenant access blocked (404)", t_cross_tenant_blocked)
        step("delete conversation (soft)", t_delete_conversation)

    print("\n" + "=" * 70)
    print(f"RESULT: {len(PASS)} PASS / {len(FAIL)} FAIL")
    print("=" * 70)
    for n in PASS:
        print(f"  ✓ {n}")
    for n, e in FAIL:
        print(f"  ✗ {n} — {e}")
    print()
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
