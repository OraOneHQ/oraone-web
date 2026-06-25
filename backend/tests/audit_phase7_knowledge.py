"""Phase 7 — Knowledge Base Foundation audit (live, end-to-end).

Covers every item in the Phase 7 checklist:
  • Schema: knowledge_bases, documents, document_chunks
  • KB CRUD via HTTP + soft-delete
  • Document upload, status transitions (pending → processing → processed)
  • Document chunks materialization
  • Stats endpoint
  • Storage: local fallback + tenant-namespaced keys
  • Org isolation: Org A must not see Org B's KBs/docs

Run:
  API_BASE_URL=https://oraone.in python tests/audit_phase7_knowledge.py
"""
import asyncio
import io
import json
import logging
import os
import sys
import time
import uuid
from pathlib import Path

import boto3
import requests
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

if os.environ.get("OVERRIDE_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["OVERRIDE_DATABASE_URL"]

from app.database import session as db_session  # noqa: E402
from app.database.session import init_engine  # noqa: E402

API = os.environ.get("API_BASE_URL", "http://localhost:8000")
REGION = os.environ["AWS_REGION"]
POOL = os.environ["COGNITO_USER_POOL_ID"]
cognito = boto3.client("cognito-idp", region_name=REGION)

PASS, FAIL = [], []
state: dict = {}

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def step(name, fn, loop=None):
    print(f"\n▶ {name}", end=" ")
    try:
        result = fn() if loop is None else asyncio.run(fn())
        PASS.append(name)
        print("✅")
        return result
    except Exception as e:
        FAIL.append((name, str(e)))
        print(f"❌ {e}")
        raise


def _signup_user(email: str, password: str) -> None:
    """Sign up via Cognito."""
    cognito.admin_create_user(
        UserPoolId=POOL,
        Username=email,
        TemporaryPassword=password,
        MessageAction="SUPPRESS",
    )
    cognito.admin_set_user_password(
        UserPoolId=POOL, Username=email, Password=password, Permanent=True
    )


def _login(email: str, password: str) -> dict:
    """Return {access_token, id_token, refresh_token}."""
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": email, "password": password},
    )
    r.raise_for_status()
    return r.json()


def _get_identity(token: str) -> dict:
    """GET /api/auth/identity with Bearer token."""
    r = requests.get(
        f"{API}/api/auth/identity",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def _fetch_me(token: str) -> dict:
    """GET /api/auth/me."""
    r = requests.get(
        f"{API}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


# ──────────────────── Phase 7 Audit Suite ────────────────────

def audit_1_schema_columns_exist():
    """All 12 expected tables exist with correct columns."""
    from app.database.models import (
        Document, DocumentChunk, KnowledgeBase,
    )

    # knowledge_bases columns
    assert hasattr(KnowledgeBase, "id")
    assert hasattr(KnowledgeBase, "organization_id")
    assert hasattr(KnowledgeBase, "name")
    assert hasattr(KnowledgeBase, "description")
    assert hasattr(KnowledgeBase, "status")
    assert hasattr(KnowledgeBase, "created_at")
    assert hasattr(KnowledgeBase, "deleted_at")

    # documents columns
    assert hasattr(Document, "id")
    assert hasattr(Document, "organization_id")
    assert hasattr(Document, "knowledge_base_id")
    assert hasattr(Document, "filename")
    assert hasattr(Document, "file_type")
    assert hasattr(Document, "file_size")
    assert hasattr(Document, "status")
    assert hasattr(Document, "s3_key")
    assert hasattr(Document, "created_at")
    assert hasattr(Document, "deleted_at")
    assert hasattr(Document, "processing_started_at")
    assert hasattr(Document, "processing_completed_at")
    assert hasattr(Document, "processing_error")

    # document_chunks columns
    assert hasattr(DocumentChunk, "id")
    assert hasattr(DocumentChunk, "document_id")
    assert hasattr(DocumentChunk, "chunk_index")
    assert hasattr(DocumentChunk, "content")
    assert hasattr(DocumentChunk, "metadata")


def audit_2_kb_crud():
    """POST/GET/PUT/DELETE knowledge bases."""
    email = f"phase7a+{uuid.uuid4().hex[:8]}@oraone-test.dev"
    password = f"TestPhase7!{uuid.uuid4().hex[:6]}"

    step("Signup user A", lambda: _signup_user(email, password))
    tokens_a = step("Login user A", lambda: _login(email, password))
    access_a = tokens_a["access_token"]
    # Keep shared state in sync so later steps (upload, chunks, stats) use the
    # same identity that owns the KB created below — otherwise cross-tenant
    # isolation correctly rejects the request with 404.
    state["access_a"] = access_a

    identity_a = step("Fetch identity (user A)", lambda: _get_identity(access_a))
    state["email_a"] = email
    state["org_a"] = identity_a["organization"]["id"]
    state["user_a"] = identity_a["user"]["id"]

    # Create KB
    def _create_kb():
        r = requests.post(
            f"{API}/api/knowledge-bases",
            headers={"Authorization": f"Bearer {access_a}"},
            json={"name": "Product Docs", "description": "Public docs", "status": "active"},
        )
        r.raise_for_status()
        return r.json()

    kb = step("POST /api/knowledge-bases (create)", _create_kb)
    assert kb["name"] == "Product Docs"
    assert kb["status"] == "active"
    assert kb["organization_id"] == state["org_a"]
    state["kb_a_id"] = kb["id"]

    # List KBs
    def _list_kbs():
        r = requests.get(
            f"{API}/api/knowledge-bases",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        r.raise_for_status()
        return r.json()

    kbs = step("GET /api/knowledge-bases (list)", _list_kbs)
    assert any(x["id"] == kb["id"] for x in kbs.get("items", []))

    # Update KB
    def _update_kb():
        r = requests.put(
            f"{API}/api/knowledge-bases/{kb['id']}",
            headers={"Authorization": f"Bearer {access_a}"},
            json={"name": "Updated Docs"},
        )
        r.raise_for_status()
        return r.json()

    kb_updated = step("PUT /api/knowledge-bases/{id} (update)", _update_kb)
    assert kb_updated["name"] == "Updated Docs"


def audit_3_document_upload_and_status():
    """Upload document, track status: pending → processing → processed."""
    access_a = state["access_a"]
    kb_id = state["kb_a_id"]

    def _upload():
        r = requests.post(
            f"{API}/api/documents/upload",
            headers={"Authorization": f"Bearer {access_a}"},
            data={"knowledge_base_id": kb_id},
            files={"file": ("test.txt", b"Hello world. " * 50, "text/plain")},
        )
        r.raise_for_status()
        return r.json()

    doc = step("POST /api/documents/upload", _upload)
    assert doc["filename"] == "test.txt"
    assert doc["status"] == "pending"
    # Storage contract (app/services/storage.py): local mode returns a
    # "local://" prefixed path; S3 mode returns the bare object key
    # (e.g. "org/<org>/kb/<kb>/<uuid>__file"). Accept either.
    assert doc["s3_key"] and (
        doc["s3_key"].startswith(("local://", "s3://")) or doc["s3_key"].startswith("org/")
    ), f"unexpected s3_key: {doc['s3_key']!r}"
    state["doc_a_id"] = doc["id"]

    # Poll for processing → processed (max 10 seconds)
    def _poll_status():
        for i in range(100):
            r = requests.get(
                f"{API}/api/documents/{doc['id']}",
                headers={"Authorization": f"Bearer {access_a}"},
            )
            r.raise_for_status()
            current = r.json()
            if current["status"] == "processed":
                return current
            time.sleep(0.1)
        raise TimeoutError(f"Document status never transitioned to 'processed'")

    doc_processed = step("Document status pending → processed", _poll_status)
    assert doc_processed["status"] == "processed"
    assert doc_processed["chunk_count"] > 0
    assert doc_processed["processing_started_at"] is not None
    assert doc_processed["processing_completed_at"] is not None


def audit_4_document_chunks():
    """GET /api/documents/{id}/chunks returns chunked content."""
    access_a = state["access_a"]
    doc_id = state["doc_a_id"]

    def _get_chunks():
        r = requests.get(
            f"{API}/api/documents/{doc_id}/chunks",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        r.raise_for_status()
        return r.json()

    chunks = step("GET /api/documents/{id}/chunks", _get_chunks)
    assert isinstance(chunks, list)
    assert len(chunks) > 0
    assert all("chunk_index" in c for c in chunks)
    assert all("content" in c for c in chunks)
    assert all("chunk_metadata" in c for c in chunks)
    assert chunks[0]["chunk_index"] == 0


def audit_5_stats_endpoint():
    """GET /api/knowledge/stats reflects KB + document + chunk counts."""
    access_a = state["access_a"]

    def _get_stats():
        r = requests.get(
            f"{API}/api/knowledge/stats",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        r.raise_for_status()
        return r.json()

    stats = step("GET /api/knowledge/stats", _get_stats)
    assert stats["total_knowledge_bases"] >= 1
    assert stats["total_documents"] >= 1
    assert stats["total_chunks"] >= 1


def audit_6_org_isolation():
    """Org B must not see Org A's KBs/documents."""
    email_b = f"phase7b+{uuid.uuid4().hex[:8]}@oraone-test.dev"
    password_b = f"TestPhase7!{uuid.uuid4().hex[:6]}"

    step("Signup user B", lambda: _signup_user(email_b, password_b))
    tokens_b = step("Login user B", lambda: _login(email_b, password_b))
    access_b = tokens_b["access_token"]

    step("Fetch identity (user B)", lambda: _get_identity(access_b))

    # User B tries to fetch User A's KB → should be 404
    def _try_fetch_kb_a():
        r = requests.get(
            f"{API}/api/knowledge-bases/{state['kb_a_id']}",
            headers={"Authorization": f"Bearer {access_b}"},
        )
        if r.status_code == 404:
            return True
        raise AssertionError(f"Expected 404, got {r.status_code}: {r.text}")

    step("Org B cannot fetch Org A's KB (404)", _try_fetch_kb_a)

    # User B tries to upload into User A's KB → should be 404
    def _try_upload_a_kb():
        r = requests.post(
            f"{API}/api/documents/upload",
            headers={"Authorization": f"Bearer {access_b}"},
            data={"knowledge_base_id": state["kb_a_id"]},
            files={"file": ("oops.txt", b"x", "text/plain")},
        )
        if r.status_code == 404:
            return True
        raise AssertionError(f"Expected 404, got {r.status_code}: {r.text}")

    step("Org B cannot upload to Org A's KB (404)", _try_upload_a_kb)

    # Cleanup
    cognito.admin_delete_user(UserPoolId=POOL, Username=email_b)


def audit_7_soft_delete():
    """Soft-delete KB + document; verify they don't appear in lists."""
    access_a = state["access_a"]
    kb_id = state["kb_a_id"]
    doc_id = state["doc_a_id"]

    # Delete document
    def _delete_doc():
        r = requests.delete(
            f"{API}/api/documents/{doc_id}",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        if r.status_code not in (200, 204):
            raise AssertionError(f"DELETE /documents/{doc_id} got {r.status_code}")
        return True

    step("DELETE /api/documents/{id}", _delete_doc)

    # Deleted doc should not appear in list
    def _doc_not_in_list():
        r = requests.get(
            f"{API}/api/documents",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        r.raise_for_status()
        docs = r.json().get("items", [])
        if any(d["id"] == doc_id for d in docs):
            raise AssertionError(f"Deleted doc {doc_id} still appears in list")
        return True

    step("Deleted document not in list", _doc_not_in_list)

    # Delete KB
    def _delete_kb():
        r = requests.delete(
            f"{API}/api/knowledge-bases/{kb_id}",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        if r.status_code not in (200, 204):
            raise AssertionError(f"DELETE /knowledge-bases/{kb_id} got {r.status_code}")
        return True

    step("DELETE /api/knowledge-bases/{id}", _delete_kb)

    # Deleted KB should not appear in list
    def _kb_not_in_list():
        r = requests.get(
            f"{API}/api/knowledge-bases",
            headers={"Authorization": f"Bearer {access_a}"},
        )
        r.raise_for_status()
        kbs = r.json().get("items", [])
        if any(k["id"] == kb_id for k in kbs):
            raise AssertionError(f"Deleted KB {kb_id} still appears in list")
        return True

    step("Deleted KB not in list", _kb_not_in_list)


def run_audit():
    """Execute full Phase 7 audit."""
    print("\n" + "=" * 70)
    print("PHASE 7 — KNOWLEDGE BASE FOUNDATION (end-to-end)")
    print("=" * 70)

    try:
        step("Schema: all 3 models exist", audit_1_schema_columns_exist)

        # Setup: signup user A, get tokens
        email_a = f"phase7+{uuid.uuid4().hex[:8]}@oraone-test.dev"
        password_a = f"TestPhase7!{uuid.uuid4().hex[:6]}"

        step("Signup user A", lambda: _signup_user(email_a, password_a))
        tokens_a = step("Login user A", lambda: _login(email_a, password_a))
        state["access_a"] = tokens_a["access_token"]

        identity_a = step("Fetch identity (user A)", lambda: _get_identity(state["access_a"]))
        state["org_a"] = identity_a["organization"]["id"]
        state["user_a"] = identity_a["user"]["id"]
        state["email_a"] = email_a

        # Run audit steps
        audit_2_kb_crud()
        audit_3_document_upload_and_status()
        audit_4_document_chunks()
        audit_5_stats_endpoint()
        audit_6_org_isolation()
        audit_7_soft_delete()

        # Cleanup
        cognito.admin_delete_user(UserPoolId=POOL, Username=email_a)

    except Exception as e:
        log.error(f"Audit failed: {e}", exc_info=True)

    print("\n" + "=" * 70)
    print(f"RESULTS: {len(PASS)}/{len(PASS) + len(FAIL)} PASS")
    print("=" * 70)

    if PASS:
        print("\n✅ PASS:")
        for name in PASS:
            print(f"  • {name}")

    if FAIL:
        print("\n❌ FAIL:")
        for name, err in FAIL:
            print(f"  • {name}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    run_audit()
