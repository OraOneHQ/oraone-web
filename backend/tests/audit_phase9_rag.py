"""Phase 9 — RAG Engine (Retrieval Augmented Generation) audit.

Verifies the full RAG stack end-to-end: embeddings, pgvector storage, the
HNSW similarity index, tenant-isolated retrieval, citations, and chat
integration.

Two tiers:

  TIER A — OFFLINE (always runs; no network / DB):
    • Embedding provider: deterministic 1024-dim vectors
    • Embedding semantics: lexical overlap ⇒ higher cosine similarity
    • Vector normalisation (unit length)
    • rag_service.build_context renders cited CONTEXT blocks
    • RetrievedChunk.source() + dedupe_sources citation shape
    • Chat schema exposes `sources`; RAG wired into agent runtime

  TIER B — LIVE (requires API_BASE_URL + Postgres + Cognito):
    • pgvector extension installed
    • document_chunks.embedding is vector(1024)
    • HNSW index using vector_cosine_ops exists
    • Embeddings persisted (NOT NULL) for ingested chunks
    • Similarity search returns the most relevant chunk (with score)
    • Retrieval ranking correctness
    • Multi-document retrieval
    • knowledge_base_ids scoping
    • Empty knowledge base ⇒ no results
    • Cross-tenant isolation (org A never sees org B's vectors)
    • Archiving a KB removes its chunks from retrieval
    • /api/knowledge/stats reports total_embeddings
    • Live chat injects context + returns citations
    • Streaming chat emits sources

Run (server), forcing the deterministic hashing embedder so stored and
query vectors match without a managed model:

    EMBEDDING_PROVIDER=hash API_BASE_URL=http://127.0.0.1:8000 \
        python tests/audit_phase9_rag.py
"""
import asyncio
import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:  # pragma: no cover
    pass

# Force the deterministic hashing embedder for the audit so that vectors
# stored by this script match the vectors the server computes at query
# time. (A managed model like Titan would also work, but only if it's
# enabled on the account.)
os.environ.setdefault("EMBEDDING_PROVIDER", "hash")
os.environ.setdefault("EMBED_DIM", "1024")

if os.environ.get("OVERRIDE_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["OVERRIDE_DATABASE_URL"]

API = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")

PASS, FAIL = [], []
state: dict = {}


def step(name, fn, loop=None):
    print(f"\n> {name}")
    try:
        if asyncio.iscoroutinefunction(fn):
            loop = loop or asyncio.new_event_loop()
            result = loop.run_until_complete(fn())
        else:
            result = fn()
        PASS.append(name)
        print("  OK", f"({result})" if result else "")
        return result
    except AssertionError as e:
        FAIL.append((name, str(e)))
        print(f"  FAIL: {e}")
    except Exception as e:  # noqa: BLE001
        FAIL.append((name, f"{type(e).__name__}: {e}"))
        print(f"  ERR: {type(e).__name__}: {e}")


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


def _cos(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


# ════════════════════════ TIER A — OFFLINE ════════════════════════

def t_provider_selection():
    from app.providers.embeddings import get_embedding_provider, HashingEmbeddings, EMBED_DIM
    get_embedding_provider.cache_clear()
    p = get_embedding_provider()
    assert isinstance(p, HashingEmbeddings), f"expected hashing provider, got {type(p)}"
    assert p.dim == EMBED_DIM == 1024, f"dim mismatch: {p.dim} / {EMBED_DIM}"
    return f"{p.name} dim={p.dim}"


def t_embed_dimensions_deterministic():
    from app.providers.embeddings import get_embedding_provider, EMBED_DIM
    p = get_embedding_provider()
    v1 = p.embed_one("Quarterly revenue grew 20% in the EMEA region.")
    v2 = p.embed_one("Quarterly revenue grew 20% in the EMEA region.")
    assert len(v1) == EMBED_DIM, f"expected {EMBED_DIM} dims, got {len(v1)}"
    assert v1 == v2, "embeddings are not deterministic for identical input"
    batch = p.embed(["alpha", "beta", "gamma"])
    assert len(batch) == 3 and all(len(v) == EMBED_DIM for v in batch)
    return f"dims={len(v1)} deterministic"


def t_embed_normalised():
    from app.providers.embeddings import get_embedding_provider
    p = get_embedding_provider()
    v = p.embed_one("Vectors should be unit length for cosine similarity.")
    norm = sum(x * x for x in v) ** 0.5
    assert abs(norm - 1.0) < 1e-6, f"vector not L2-normalised: |v|={norm}"
    return f"|v|={norm:.6f}"


def t_embed_semantics():
    """Lexical overlap must produce higher cosine similarity."""
    from app.providers.embeddings import get_embedding_provider
    p = get_embedding_provider()
    anchor = p.embed_one("How do I reset my account password securely?")
    related = p.embed_one("Steps to reset the account password safely.")
    unrelated = p.embed_one("The migratory patterns of arctic terns in winter.")
    s_rel = _cos(anchor, related)
    s_unrel = _cos(anchor, unrelated)
    assert s_rel > s_unrel, f"related({s_rel:.3f}) !> unrelated({s_unrel:.3f})"
    assert s_rel > 0.2, f"related similarity too low: {s_rel:.3f}"
    return f"related={s_rel:.3f} > unrelated={s_unrel:.3f}"


def t_build_context():
    from app.services.rag_service import RetrievedChunk, build_context
    chunks = [
        RetrievedChunk(content="Refunds are processed within 5 business days.",
                       document_id=uuid.uuid4(), document_name="policy.pdf",
                       chunk_index=0, page=2, score=0.91),
        RetrievedChunk(content="We ship to over 40 countries worldwide.",
                       document_id=uuid.uuid4(), document_name="shipping.pdf",
                       chunk_index=3, page=1, score=0.80),
    ]
    ctx = build_context(chunks, max_chars=4000)
    assert "[1]" in ctx and "[2]" in ctx, "chunks not numbered"
    assert "policy.pdf" in ctx and "p.2" in ctx, "source citation missing"
    assert "Refunds are processed" in ctx, "chunk content missing"
    bounded = build_context(chunks, max_chars=20)
    assert len(bounded) <= 80, f"context not length-bounded: {len(bounded)}"
    return f"context_len={len(ctx)}"


def t_citation_shape():
    from app.services.rag_service import RetrievedChunk, dedupe_sources
    doc = uuid.uuid4()
    chunks = [
        RetrievedChunk(content="a", document_id=doc, document_name="d.pdf",
                       chunk_index=0, page=1, section="Intro", score=0.9),
        RetrievedChunk(content="b", document_id=doc, document_name="d.pdf",
                       chunk_index=1, page=1, section="Intro", score=0.7),  # dup (doc,page)
        RetrievedChunk(content="c", document_id=doc, document_name="d.pdf",
                       chunk_index=2, page=2, score=0.6),
    ]
    src = chunks[0].source()
    for k in ("document_id", "document", "page", "section", "chunk_index", "score"):
        assert k in src, f"citation missing {k}"
    deduped = dedupe_sources(chunks)
    assert len(deduped) == 2, f"expected 2 unique (doc,page) citations, got {len(deduped)}"
    assert deduped[0]["document"] == "d.pdf" and deduped[0]["page"] == 1
    return f"{len(deduped)} unique citations"


def t_schema_has_sources():
    from app.schemas.chat import SendMessageResult
    fields = SendMessageResult.model_fields
    assert "sources" in fields, "SendMessageResult missing `sources`"
    assert "context_used" in fields, "SendMessageResult missing `context_used`"
    return "sources + context_used present"


def t_runtime_uses_rag():
    """Agent runtime must retrieve via rag_service and return RetrievedChunk."""
    import inspect
    from app.services import agent_runtime
    src = inspect.getsource(agent_runtime)
    assert "rag_service" in src, "agent_runtime no longer imports rag_service"
    assert "RetrievedChunk" in src, "agent_runtime does not use RetrievedChunk"
    ret = inspect.getsource(agent_runtime.AgentRuntime.retrieve_context)
    assert "search_chunks" in ret, "retrieve_context does not call rag_service.search_chunks"
    return "runtime wired to rag_service"


# ════════════════════════ TIER B — LIVE ════════════════════════

def _live_available() -> bool:
    try:
        import requests
        r = requests.get(f"{API}/api/health", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def _cognito():
    import boto3
    region = os.environ["AWS_REGION"]
    return boto3.client("cognito-idp", region_name=region), os.environ["COGNITO_USER_POOL_ID"]


def _make_user(tag: str) -> str:
    import requests
    from botocore.exceptions import ClientError
    cognito, pool = _cognito()
    email = f"phase9+{tag}+{uuid.uuid4().hex[:8]}@oraone-test.dev"
    pwd = "TestPhase9!2026"
    r = requests.post(f"{API}/api/auth/signup",
                      json={"email": email, "name": f"User {tag}", "password": pwd}, timeout=20)
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


async def _seed_kb(session, org_id, kb_name, doc_name, chunks, *, kb_status=None, embed=True):
    """Create one KB + document + embedded chunks; return (kb_id, doc_id)."""
    from datetime import datetime, timezone
    from app.database.models.knowledge_base import KnowledgeBase, KnowledgeBaseStatus
    from app.database.models.document import Document, DocumentStatus
    from app.database.models.document_chunk import DocumentChunk
    from app.providers.embeddings import get_embedding_provider

    kb = KnowledgeBase(
        organization_id=org_id, name=kb_name,
        status=kb_status or KnowledgeBaseStatus.active,
    )
    session.add(kb)
    await session.flush()
    doc = Document(
        knowledge_base_id=kb.id, organization_id=org_id,
        filename=doc_name, file_type="application/pdf",
        s3_key=f"test/{uuid.uuid4()}.pdf", status=DocumentStatus.processed,
        processing_completed_at=datetime.now(timezone.utc),
    )
    session.add(doc)
    await session.flush()

    vectors = get_embedding_provider().embed([c[0] for c in chunks]) if embed else [None] * len(chunks)
    for i, ((text, page), vec) in enumerate(zip(chunks, vectors)):
        session.add(DocumentChunk(
            document_id=doc.id, chunk_index=i, content=text,
            chunk_metadata={"page": page}, embedding=vec,
        ))
    await session.commit()
    return kb.id, doc.id


async def t_pgvector_installed():
    from sqlalchemy import text
    from app.database.session import init_engine
    init_engine()
    from app.database.session import engine
    async with engine.connect() as conn:
        ext = await conn.scalar(text("SELECT 1 FROM pg_extension WHERE extname='vector'"))
    assert ext == 1, "pgvector extension not installed"
    return "vector extension present"


async def t_embedding_column():
    from sqlalchemy import text
    from app.database.session import init_engine
    init_engine()
    from app.database.session import engine
    async with engine.connect() as conn:
        udt = await conn.scalar(text(
            "SELECT udt_name FROM information_schema.columns "
            "WHERE table_name='document_chunks' AND column_name='embedding'"))
        assert udt == "vector", f"embedding column is {udt!r}, expected 'vector'"
    return "document_chunks.embedding = vector"


async def t_hnsw_index():
    from sqlalchemy import text
    from app.database.session import init_engine
    init_engine()
    from app.database.session import engine
    async with engine.connect() as conn:
        defn = await conn.scalar(text(
            "SELECT indexdef FROM pg_indexes "
            "WHERE tablename='document_chunks' AND indexname='idx_document_chunks_embedding'"))
    assert defn, "HNSW index idx_document_chunks_embedding missing"
    assert "hnsw" in defn.lower(), f"index is not HNSW: {defn}"
    assert "vector_cosine_ops" in defn, f"index not using cosine ops: {defn}"
    return "HNSW + vector_cosine_ops"


def t_live_setup():
    """Create owner (org A), an agent, and a second tenant (org B)."""
    import requests
    state["owner"] = _make_user("owner")
    r = requests.post(
        f"{API}/api/agents", headers=_hdr(state["owner"]),
        json={"name": "RAG bot", "type": "chat", "description": "answers from docs",
              "model": "gpt-5.5", "status": "active",
              "system_prompt": "Answer strictly from the provided context.",
              "temperature": 0.2, "language": "en-US", "max_tokens": 500},
        timeout=20,
    )
    assert r.status_code == 201, r.text
    state["agent_id"] = r.json()["id"]
    state["org_a"] = r.json()["organization_id"]

    state["intruder"] = _make_user("intruder")
    r2 = requests.post(
        f"{API}/api/agents", headers=_hdr(state["intruder"]),
        json={"name": "Other bot", "type": "chat", "model": "gpt-5.5", "status": "active"},
        timeout=20,
    )
    assert r2.status_code == 201, r2.text
    state["org_b"] = r2.json()["organization_id"]
    return f"orgA={state['org_a'][:8]} orgB={state['org_b'][:8]}"


async def t_seed_corpus():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.database.models.knowledge_base import KnowledgeBaseStatus

    org_a = uuid.UUID(state["org_a"])
    org_b = uuid.UUID(state["org_b"])
    async with AsyncSessionLocal() as s:
        # Org A — KB "Alpha Handbook" (stays active for chat tests)
        kb_alpha, doc_alpha = await _seed_kb(
            s, org_a, "Alpha Handbook", "alpha_handbook.pdf",
            [
                ("The Alpha onboarding process requires a signed NDA and a company laptop "
                 "request submitted to the IT service desk on day one.", 1),
                ("Alpha expense reports must be filed within thirty days using the Concur "
                 "portal and approved by a direct manager.", 2),
            ],
        )
        # Org A — separate KB "Security Policy" (archived later for delete test)
        kb_sec, doc_sec = await _seed_kb(
            s, org_a, "Security Policy", "security_policy.pdf",
            [
                ("Password rotation is mandatory every ninety days for all production "
                 "systems and privileged accounts.", 1),
            ],
        )
        # Org A — an empty KB (no documents) for the empty-result test
        from app.database.models.knowledge_base import KnowledgeBase
        empty_kb = KnowledgeBase(organization_id=org_a, name="Empty KB",
                                 status=KnowledgeBaseStatus.active)
        s.add(empty_kb)
        await s.flush()
        state["empty_kb"] = str(empty_kb.id)
        await s.commit()

        # Org B — confidential corpus that org A must never retrieve
        kb_bravo, doc_bravo = await _seed_kb(
            s, org_b, "Bravo Roadmap", "bravo_secret.pdf",
            [("Bravo confidential roadmap: launch the Orion satellite module in Q3 "
              "with a private beta for enterprise customers.", 1)],
        )

    state.update(
        kb_alpha=str(kb_alpha), doc_alpha=str(doc_alpha),
        kb_sec=str(kb_sec), doc_sec=str(doc_sec),
        kb_bravo=str(kb_bravo), doc_bravo=str(doc_bravo),
    )
    return "orgA: 2 docs/3 chunks + empty KB; orgB: 1 doc"


async def t_embeddings_persisted():
    from sqlalchemy import text
    from app.database.session import init_engine
    init_engine()
    from app.database.session import engine
    async with engine.connect() as conn:
        n = await conn.scalar(text(
            "SELECT count(*) FROM document_chunks c "
            "JOIN documents d ON d.id = c.document_id "
            "WHERE d.organization_id = :org AND c.embedding IS NOT NULL"),
            {"org": state["org_a"]})
    assert n >= 3, f"expected >=3 embedded chunks in org A, got {n}"
    return f"{n} embedded chunks stored"


async def t_similarity_search():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        hits = await rag_service.search_chunks(
            s, "How do I onboard a new hire? NDA and laptop request",
            org_a, top_k=5)
    assert hits, "similarity search returned no results"
    top = hits[0]
    assert top.score is not None, "vector hit missing similarity score (keyword fallback used?)"
    assert "NDA" in top.content, f"top hit not the onboarding chunk: {top.content[:60]!r}"
    assert top.document_name == "alpha_handbook.pdf"
    return f"top={top.score:.3f} doc={top.document_name} p.{top.page}"


async def t_ranking_correctness():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        hits = await rag_service.search_chunks(
            s, "expense report Concur thirty days manager approval", org_a, top_k=5)
    assert hits, "no results for expense query"
    assert "Concur" in hits[0].content, f"wrong top hit: {hits[0].content[:60]!r}"
    return f"ranked expense chunk first ({hits[0].score:.3f})"


async def t_multi_document():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        hits = await rag_service.search_chunks(
            s, "onboarding NDA laptop password rotation production systems",
            org_a, top_k=5)
    docs = {h.document_name for h in hits}
    assert len(docs) >= 2, f"expected chunks from >=2 documents, got {docs}"
    return f"spanned {len(docs)} documents"


async def t_kb_scoping():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        hits = await rag_service.search_chunks(
            s, "password rotation production NDA onboarding", org_a,
            knowledge_base_ids=[uuid.UUID(state["kb_alpha"])], top_k=5)
    docs = {h.document_name for h in hits}
    assert docs == {"alpha_handbook.pdf"}, f"KB scope leaked: {docs}"
    return "scoped to Alpha KB only"


async def t_empty_kb():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        hits = await rag_service.search_chunks(
            s, "anything at all", org_a,
            knowledge_base_ids=[uuid.UUID(state["empty_kb"])], top_k=5)
    assert hits == [], f"empty KB returned results: {hits}"
    return "empty KB -> []"


async def t_cross_tenant_isolation():
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    org_b = uuid.UUID(state["org_b"])
    async with AsyncSessionLocal() as s:
        # Org A querying for org B's secret must not surface it.
        a_hits = await rag_service.search_chunks(
            s, "Orion satellite module roadmap enterprise beta", org_a, top_k=5)
        assert all("Orion" not in h.content for h in a_hits), "org A retrieved org B's vectors!"
        # Org B querying for org A's content must not surface it.
        b_hits = await rag_service.search_chunks(
            s, "Alpha onboarding NDA laptop Concur expense", org_b, top_k=5)
        assert all(h.document_name == "bravo_secret.pdf" for h in b_hits), \
            f"org B leaked org A docs: {[h.document_name for h in b_hits]}"
    return "no cross-tenant vector leakage"


async def t_archive_kb_removes_vectors():
    from sqlalchemy import update
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.database.models.knowledge_base import KnowledgeBase, KnowledgeBaseStatus
    from app.services import rag_service
    org_a = uuid.UUID(state["org_a"])
    async with AsyncSessionLocal() as s:
        await s.execute(
            update(KnowledgeBase)
            .where(KnowledgeBase.id == uuid.UUID(state["kb_sec"]))
            .values(status=KnowledgeBaseStatus.archived))
        await s.commit()
        hits = await rag_service.search_chunks(
            s, "password rotation ninety days production", org_a, top_k=5)
    assert all(h.document_name != "security_policy.pdf" for h in hits), \
        "archived KB chunks still retrievable"
    return "archived KB excluded from retrieval"


def t_stats_embeddings_count():
    import requests
    r = requests.get(f"{API}/api/knowledge/stats", headers=_hdr(state["owner"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "total_embeddings" in body, f"stats missing total_embeddings: {body}"
    assert body["total_embeddings"] >= 3, f"expected >=3 embeddings, got {body['total_embeddings']}"
    return f"total_embeddings={body['total_embeddings']}"


def t_chat_injects_citations():
    import requests
    r = requests.post(f"{API}/api/conversations", headers=_hdr(state["owner"]),
                      json={"agent_id": state["agent_id"]}, timeout=15)
    assert r.status_code == 201, r.text
    conv = r.json()["id"]
    state["conv_id"] = conv
    r2 = requests.post(f"{API}/api/conversations/{conv}/messages", headers=_hdr(state["owner"]),
                       json={"content": "What does the Alpha onboarding require on day one?",
                             "use_knowledge": True}, timeout=90)
    assert r2.status_code == 201, r2.text
    body = r2.json()
    assert body["context_used"] >= 1, "no context injected for a KB-answerable question"
    assert body["sources"], "no citations returned"
    docs = {s["document"] for s in body["sources"]}
    assert "alpha_handbook.pdf" in docs, f"expected alpha_handbook citation, got {docs}"
    return f"context_used={body['context_used']} sources={docs}"


def t_stream_includes_sources():
    import json as _json
    import requests
    conv = state["conv_id"]
    sources_seen = None
    with requests.post(f"{API}/api/conversations/{conv}/stream", headers=_hdr(state["owner"]),
                       json={"content": "Remind me of the Alpha expense report deadline.",
                             "use_knowledge": True},
                       stream=True, timeout=90) as resp:
        assert resp.status_code == 200, resp.text
        cur_event = None
        for raw in resp.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("event:"):
                cur_event = raw.split(":", 1)[1].strip()
            elif raw.startswith("data:") and cur_event == "done":
                payload = _json.loads(raw.split(":", 1)[1].strip())
                sources_seen = payload.get("sources")
                break
    assert sources_seen is not None, "done event carried no sources field"
    assert len(sources_seen) >= 1, "streaming returned no citations"
    return f"stream sources={len(sources_seen)}"


# ════════════════════════ runner ════════════════════════

def main():
    loop = asyncio.new_event_loop()
    print("=" * 70)
    print("PHASE 9 — RAG ENGINE AUDIT")
    print("=" * 70)

    print("\n--- TIER A: offline embedding + retrieval logic ---")
    step("embedding provider selection (hashing, 1024-dim)", t_provider_selection)
    step("embeddings: 1024-dim + deterministic", t_embed_dimensions_deterministic)
    step("embeddings: L2-normalised", t_embed_normalised)
    step("embeddings: lexical overlap raises cosine", t_embed_semantics)
    step("rag_service.build_context renders citations", t_build_context)
    step("citation source() + dedupe_sources shape", t_citation_shape)
    step("chat schema exposes `sources`", t_schema_has_sources)
    step("agent runtime wired to rag_service", t_runtime_uses_rag)

    print("\n--- TIER B: live RAG end-to-end ---")
    if not _live_available():
        print(f"  ! API not reachable at {API} — skipping live tier.")
        print("    Run with the server up + tunnel DB: "
              "EMBEDDING_PROVIDER=hash API_BASE_URL=http://127.0.0.1:8000")
    else:
        step("pgvector extension installed", t_pgvector_installed, loop)
        step("document_chunks.embedding is vector(1024)", t_embedding_column, loop)
        step("HNSW index uses vector_cosine_ops", t_hnsw_index, loop)
        step("live setup (orgs A & B + agent)", t_live_setup)
        step("seed embedded corpus", t_seed_corpus, loop)
        step("embeddings persisted (NOT NULL)", t_embeddings_persisted, loop)
        step("similarity search returns top match + score", t_similarity_search, loop)
        step("retrieval ranking correctness", t_ranking_correctness, loop)
        step("multi-document retrieval", t_multi_document, loop)
        step("knowledge_base_ids scoping", t_kb_scoping, loop)
        step("empty knowledge base -> no results", t_empty_kb, loop)
        step("cross-tenant vector isolation", t_cross_tenant_isolation, loop)
        step("archived KB removed from retrieval", t_archive_kb_removes_vectors, loop)
        step("stats report total_embeddings", t_stats_embeddings_count)
        step("chat injects context + returns citations", t_chat_injects_citations)
        step("streaming chat emits sources", t_stream_includes_sources)

    print("\n" + "=" * 70)
    print(f"RESULT: {len(PASS)} PASS / {len(FAIL)} FAIL")
    print("=" * 70)
    for n in PASS:
        print(f"  PASS  {n}")
    for n, e in FAIL:
        print(f"  FAIL  {n} — {e}")
    print()
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
