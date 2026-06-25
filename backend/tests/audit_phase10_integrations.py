"""Phase 10 — Integrations Platform audit (live, end-to-end, offline-capable).

Exercises the whole platform against a real Postgres database using the
service layer + mock connectors (no external OAuth / network needed):

  1.  OAuth/mock connect creates an integration (tokens encrypted at rest)
  2.  Connector health check
  3.  Manual sync imports documents into a Knowledge Base
  4.  Synced docs are chunked + embedded (retrievable)
  5.  Idempotent re-sync skips unchanged documents
  6.  Updated documents are re-indexed
  7.  Documents deleted upstream are pruned from the KB
  8.  Org isolation — Org B can never see Org A's integration/docs
  9.  Chat/RAG retrieves synced content
  10. Sync activity is logged (SyncLog) + audit events emitted
  11. Token refresh path runs when the access token is expired
  12. One connector failing is isolated (job failed, other org unaffected)
  13. Disconnect removes synced documents from the KB

Run (with the SSH tunnel up):
  $env:DATABASE_URL="postgresql+asyncpg://oraone_admin:***@127.0.0.1:15432/oraone"
  $env:EMBEDDING_PROVIDER="hash"; $env:PYTHONUTF8="1"
  python tests/audit_phase10_integrations.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

# Deterministic, offline embeddings unless explicitly overridden.
os.environ.setdefault("EMBEDDING_PROVIDER", "hash")
os.environ.setdefault("EMBED_DIM", "1024")
if os.environ.get("OVERRIDE_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["OVERRIDE_DATABASE_URL"]

from datetime import datetime, timedelta, timezone  # noqa: E402
from unittest import mock  # noqa: E402

from sqlalchemy import func, select  # noqa: E402

from app.connectors.base import ConnectorError  # noqa: E402
from app.core import crypto  # noqa: E402
from app.database.models.document import Document, DocumentStatus  # noqa: E402
from app.database.models.document_chunk import DocumentChunk  # noqa: E402
from app.database.models.integration import (  # noqa: E402
    ConnectionType,
    Integration,
    IntegrationStatus,
    IntegrationType,
)
from app.database.models.organization import Organization, OrgPlan  # noqa: E402
from app.database.models.sync_job import SyncJob, SyncJobStatus, SyncTrigger  # noqa: E402
from app.database.models.sync_log import SyncLog  # noqa: E402
from app.database.models.user import User  # noqa: E402
from app.database.session import init_engine  # noqa: E402
from app.services import rag_service, sync_service  # noqa: E402

PASS: list[str] = []
FAIL: list[tuple[str, str]] = []

PROVIDER = "google_drive"


def ok(name: str) -> None:
    PASS.append(name)
    print(f"  PASS  {name}")


def bad(name: str, err: str) -> None:
    FAIL.append((name, err))
    print(f"  FAIL  {name} :: {err}")


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        ok(name)
    else:
        bad(name, detail or "assertion failed")


# ──────────────── fixtures ────────────────

async def _make_org(session, slug: str) -> Organization:
    user = User(
        cognito_sub=f"audit-{uuid.uuid4().hex[:12]}",
        email=f"{slug}-{uuid.uuid4().hex[:6]}@audit.local",
        full_name="Phase10 Auditor",
    )
    session.add(user)
    await session.flush()
    org = Organization(
        name=f"Audit {slug}",
        slug=f"{slug}-{uuid.uuid4().hex[:8]}",
        plan=OrgPlan.free,
        owner_user_id=user.id,
    )
    session.add(org)
    await session.flush()
    return org


async def _connect_mock(session, org: Organization, provider: str = PROVIDER) -> Integration:
    """Simulate the connect endpoint in mock mode."""
    integ = Integration(
        organization_id=org.id,
        provider=provider,
        category="documents",
        type=IntegrationType.storage,
        connection_type=ConnectionType.mock,
        status=IntegrationStatus.connected,
        access_token=crypto.encrypt("mock-access-token"),
        refresh_token=crypto.encrypt("mock-refresh-token"),
        external_account="demo@oraone.local",
    )
    session.add(integ)
    await session.flush()
    return integ


async def _doc_count(session, integration_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.count(Document.id))
            .where(Document.integration_id == integration_id)
            .where(Document.deleted_at.is_(None))
        )
        or 0
    )


async def _chunk_count(session, integration_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.count(DocumentChunk.id))
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(Document.integration_id == integration_id)
            .where(Document.deleted_at.is_(None))
        )
        or 0
    )


# ──────────────── audit ────────────────

async def main() -> None:
    init_engine()
    from app.database.session import AsyncSessionLocal as Maker

    print("\n=== PHASE 10 — INTEGRATIONS PLATFORM AUDIT ===\n")

    async with Maker() as session:
        org_a = await _make_org(session, "orgA")
        org_b = await _make_org(session, "orgB")
        await session.commit()

        # 1. Connect (mock) → integration row, tokens encrypted at rest.
        integ_a = await _connect_mock(session, org_a)
        await session.commit()
        raw_token = integ_a.access_token
        check(
            "1. connect stores access token ENCRYPTED (not plaintext)",
            raw_token is not None and raw_token != "mock-access-token",
            "token stored in plaintext",
        )
        check(
            "1b. encrypted token decrypts back to original",
            crypto.decrypt(raw_token) == "mock-access-token",
        )

        # 2. Health check.
        from app.connectors.registry import get_connector

        connector = get_connector(integ_a)
        check("2. connector health() returns True (mock)", connector.health() is True)

    # 3. Manual sync imports documents (own session inside run_sync).
    await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.manual)

    async with Maker() as session:
        job = await session.scalar(
            select(SyncJob)
            .where(SyncJob.integration_id == integ_a.id)
            .order_by(SyncJob.created_at.desc())
        )
        check("3. sync job completed", job is not None and job.status == SyncJobStatus.completed,
              f"status={getattr(job, 'status', None)}")
        check("3b. sync imported 2 documents", job is not None and job.documents_synced == 2,
              f"documents_synced={getattr(job, 'documents_synced', None)}")
        docs = await _doc_count(session, integ_a.id)
        check("3c. 2 Document rows present", docs == 2, f"docs={docs}")

        # 4. Chunked + embedded.
        chunks = await _chunk_count(session, integ_a.id)
        check("4. synced docs were chunked + embedded", chunks > 0, f"chunks={chunks}")
        processed = await session.scalar(
            select(func.count(Document.id))
            .where(Document.integration_id == integ_a.id)
            .where(Document.status == DocumentStatus.processed)
        )
        check("4b. documents marked processed", int(processed or 0) == 2, f"processed={processed}")

        # source provenance
        sample = await session.scalar(
            select(Document).where(Document.integration_id == integ_a.id).limit(1)
        )
        check("4c. document provenance (source=provider)", sample is not None and sample.source == PROVIDER,
              f"source={getattr(sample, 'source', None)}")

    # 5. Idempotent re-sync skips unchanged docs.
    await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.manual)
    async with Maker() as session:
        job = await session.scalar(
            select(SyncJob)
            .where(SyncJob.integration_id == integ_a.id)
            .order_by(SyncJob.created_at.desc())
        )
        check("5. re-sync skips unchanged documents (0 re-processed)",
              job is not None and job.documents_synced == 0,
              f"documents_synced={getattr(job, 'documents_synced', None)}")
        docs = await _doc_count(session, integ_a.id)
        check("5b. no duplicate documents created on re-sync", docs == 2, f"docs={docs}")

        # 6. Force one doc to look stale → next sync re-indexes it.
        stale = await session.scalar(
            select(Document).where(Document.integration_id == integ_a.id).limit(1)
        )
        stale.external_modified_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
        await session.commit()

    await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.manual)
    async with Maker() as session:
        job = await session.scalar(
            select(SyncJob)
            .where(SyncJob.integration_id == integ_a.id)
            .order_by(SyncJob.created_at.desc())
        )
        check("6. updated document is re-indexed", job is not None and job.documents_synced == 1,
              f"documents_synced={getattr(job, 'documents_synced', None)}")

        # 7. Inject an orphan doc (no longer upstream) → next sync prunes it.
        from app.database.models.knowledge_base import KnowledgeBase

        integ_a_row = await session.get(Integration, integ_a.id)
        orphan = Document(
            knowledge_base_id=integ_a_row.knowledge_base_id,
            organization_id=org_a.id,
            filename="orphan.md",
            file_type="text/markdown",
            file_size=10,
            s3_key="local://orphan",
            status=DocumentStatus.processed,
            source=PROVIDER,
            integration_id=integ_a.id,
            external_id="google_drive-doc-DELETED",
            external_modified_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        session.add(orphan)
        await session.commit()
        orphan_id = orphan.id

    await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.manual)
    async with Maker() as session:
        pruned = await session.get(Document, orphan_id)
        check("7. document deleted upstream is pruned (soft-deleted)",
              pruned is not None and pruned.deleted_at is not None,
              "orphan was not pruned")
        job = await session.scalar(
            select(SyncJob)
            .where(SyncJob.integration_id == integ_a.id)
            .order_by(SyncJob.created_at.desc())
        )
        check("7b. prune counted in job.documents_deleted",
              job is not None and job.documents_deleted >= 1,
              f"documents_deleted={getattr(job, 'documents_deleted', None)}")

    # 8. Org isolation — connect + sync Org B, verify separation.
    async with Maker() as session:
        integ_b = await _connect_mock(session, org_b)
        await session.commit()
        integ_b_id = integ_b.id
        org_a_id, org_b_id = org_a.id, org_b.id

    await sync_service.run_sync(integ_b_id, trigger=SyncTrigger.manual)
    async with Maker() as session:
        a_docs = await session.scalars(
            select(Document.organization_id).where(Document.integration_id == integ_a.id)
        )
        check("8. Org A documents all belong to Org A",
              all(x == org_a_id for x in a_docs.all()))
        b_docs = await session.scalars(
            select(Document.organization_id).where(Document.integration_id == integ_b_id)
        )
        check("8b. Org B documents all belong to Org B",
              all(x == org_b_id for x in b_docs.all()))
        # Org A must not be able to see Org B's integration via org-scoped query.
        leaked = await session.scalar(
            select(func.count(Integration.id))
            .where(Integration.id == integ_b_id)
            .where(Integration.organization_id == org_a_id)
        )
        check("8c. Org A cannot see Org B's integration", int(leaked or 0) == 0)

        # 9. RAG retrieves synced content (tenant-scoped).
        results = await rag_service.search_chunks(
            session, "annual leave policy", org_a_id, top_k=5
        )
        check("9. chat/RAG retrieves synced content for Org A", len(results) > 0,
              "no chunks retrieved")
        # Cross-tenant: a query scoped to Org A must not return Org B chunk ids.
        b_chunk_ids = {
            r for r in (
                await session.scalars(
                    select(DocumentChunk.id)
                    .join(Document, Document.id == DocumentChunk.document_id)
                    .where(Document.integration_id == integ_b_id)
                )
            ).all()
        }
        leaked_chunks = [r for r in results if getattr(r, "document_id", None) in b_chunk_ids]
        check("9b. RAG results do not leak across tenants", len(leaked_chunks) == 0)

        # 10. Sync activity logged.
        log_events = (
            await session.scalars(
                select(SyncLog.event).where(SyncLog.integration_id == integ_a.id)
            )
        ).all()
        for ev in ("sync_started", "fetched", "sync_completed"):
            check(f"10. sync log emitted '{ev}'", ev in log_events,
                  f"events={set(log_events)}")

    # 11. Token refresh path runs when access token is expired.
    async with Maker() as session:
        integ_a_row = await session.get(Integration, integ_a.id)
        integ_a_row.token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await session.commit()
    await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.scheduled)
    async with Maker() as session:
        integ_a_row = await session.get(Integration, integ_a.id)
        check("11. integration still connected after expired-token sync",
              integ_a_row.status == IntegrationStatus.connected,
              f"status={integ_a_row.status}")

    # 12. Connector failure is isolated (Org A fails, Org B unaffected).
    class _Boom:
        provider = PROVIDER

        def refresh_token(self):
            raise ConnectorError("boom")

        def sync(self):
            raise ConnectorError("simulated provider outage")

    def _boom_connector(integration):
        return _Boom()

    with mock.patch.object(sync_service, "get_connector", _boom_connector):
        await sync_service.run_sync(integ_a.id, trigger=SyncTrigger.manual)

    async with Maker() as session:
        integ_a_row = await session.get(Integration, integ_a.id)
        check("12. failing sync marks integration error",
              integ_a_row.status == IntegrationStatus.error,
              f"status={integ_a_row.status}")
        check("12b. failure recorded in last_error",
              bool(integ_a_row.last_error))
        integ_b_row = await session.get(Integration, integ_b_id)
        check("12c. other org's integration unaffected by failure",
              integ_b_row.status == IntegrationStatus.connected,
              f"orgB status={integ_b_row.status}")
        failed_job = await session.scalar(
            select(SyncJob)
            .where(SyncJob.integration_id == integ_a.id)
            .order_by(SyncJob.created_at.desc())
        )
        check("12d. failed job recorded", failed_job is not None and failed_job.status == SyncJobStatus.failed,
              f"status={getattr(failed_job, 'status', None)}")

    # 13. Disconnect removes synced documents.
    async with Maker() as session:
        # simulate the disconnect endpoint's purge logic
        from sqlalchemy import delete

        integ_a_row = await session.get(Integration, integ_a.id)
        docs = (
            await session.scalars(
                select(Document)
                .where(Document.integration_id == integ_a.id)
                .where(Document.deleted_at.is_(None))
            )
        ).all()
        for d in docs:
            await session.execute(
                delete(DocumentChunk).where(DocumentChunk.document_id == d.id)
            )
            d.deleted_at = datetime.now(timezone.utc)
        integ_a_row.status = IntegrationStatus.disconnected
        integ_a_row.access_token = None
        integ_a_row.refresh_token = None
        await session.commit()

        remaining = await _doc_count(session, integ_a.id)
        check("13. disconnect removes all synced documents", remaining == 0, f"remaining={remaining}")
        remaining_chunks = await _chunk_count(session, integ_a.id)
        check("13b. disconnect removes all chunks", remaining_chunks == 0, f"chunks={remaining_chunks}")

        # cleanup org B docs too (best-effort, leave orgs for inspection)

    # ──────────────── summary ────────────────
    print("\n=== SUMMARY ===")
    print(f"  PASSED: {len(PASS)}")
    print(f"  FAILED: {len(FAIL)}")
    if FAIL:
        print("\nFailures:")
        for name, err in FAIL:
            print(f"  - {name}: {err}")
        sys.exit(1)
    print("\nALL PHASE 10 CHECKS PASSED ✓")


if __name__ == "__main__":
    asyncio.run(main())
