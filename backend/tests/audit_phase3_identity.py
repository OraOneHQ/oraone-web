"""Phase 3 — Identity Layer audit.

Validates:
  • Schema columns on users / organizations / organization_members
  • Auto-workspace creation on first GET /api/auth/identity
  • Idempotency on subsequent calls (is_new_user flips false)
  • Response shape: {user, organization, membership, is_new_user}

The script signs up a throwaway user via boto3, admin-confirms, logs in,
hits /api/auth/identity twice, and tears the user down at the end.

Run:
  API_BASE_URL=http://127.0.0.1:8101 python tests/audit_phase3_identity.py
"""
import asyncio
import os
import sys
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
if os.environ.get("OVERRIDE_ALEMBIC_DATABASE_URL"):
    os.environ["ALEMBIC_DATABASE_URL"] = os.environ["OVERRIDE_ALEMBIC_DATABASE_URL"]

from app.database import session as db_session  # noqa: E402
from app.database.session import init_engine  # noqa: E402
from app.database import models  # noqa: F401,E402

API = os.environ.get("API_BASE_URL", "http://127.0.0.1:8001")
REGION = os.environ["AWS_REGION"]
USER_POOL_ID = os.environ["COGNITO_USER_POOL_ID"]

cognito = boto3.client("cognito-idp", region_name=REGION)

EMAIL = f"phase3+{uuid.uuid4().hex[:10]}@oraone-test.dev"
NAME = "Alice Tester"  # → workspace should be "Alice Workspace"
PASSWORD = "TestPhase3!2026"

PASS, FAIL = [], []
state: dict = {}


def step(name, fn, loop=None):
    print(f"\n▶ {name}")
    try:
        if asyncio.iscoroutinefunction(fn):
            result = loop.run_until_complete(fn())
        else:
            result = fn()
        PASS.append(name)
        print("  ✓ OK", f"({result})" if result else "")
    except AssertionError as e:
        FAIL.append((name, str(e))); print(f"  ✗ FAIL: {e}")
    except Exception as e:
        FAIL.append((name, f"{type(e).__name__}: {e}")); print(f"  ✗ ERR: {type(e).__name__}: {e}")


# ───────── schema checks (DB-level) ─────────


REQUIRED_COLUMNS = {
    "users": {"id", "cognito_sub", "email", "full_name", "avatar_url",
              "role", "status", "created_at", "last_login_at"},
    "organizations": {"id", "name", "slug", "plan", "owner_user_id", "created_at"},
    "organization_members": {"id", "organization_id", "user_id", "role",
                             "status", "joined_at"},
}


async def t_schema_columns():
    init_engine()
    from app.database.session import engine
    missing_per_table = {}
    async with engine.connect() as conn:
        for table, required in REQUIRED_COLUMNS.items():
            rows = (await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='public' AND table_name=:t"
            ), {"t": table})).all()
            present = {r[0] for r in rows}
            missing = required - present
            if missing:
                missing_per_table[table] = missing
    assert not missing_per_table, f"missing columns: {missing_per_table}"
    return f"all {sum(len(v) for v in REQUIRED_COLUMNS.values())} required columns present"


# ───────── auth setup ─────────


def t_signup_and_confirm():
    """Create a confirmed Cognito user for the audit."""
    r = requests.post(
        f"{API}/api/auth/signup",
        json={"email": EMAIL, "name": NAME, "password": PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"signup: {r.status_code} {r.text}"
    try:
        cognito.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=EMAIL)
    except ClientError as e:
        if e.response["Error"]["Code"] != "NotAuthorizedException":
            raise
    cognito.admin_update_user_attributes(
        UserPoolId=USER_POOL_ID,
        Username=EMAIL,
        UserAttributes=[{"Name": "email_verified", "Value": "true"}],
    )


def t_login_and_keep_token():
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    state["access_token"] = r.json()["access_token"]


# ───────── identity endpoint ─────────


def _identity():
    return requests.get(
        f"{API}/api/auth/identity",
        headers={"Authorization": f"Bearer {state['access_token']}"},
        timeout=20,
    )


def t_identity_unauth():
    """GET /api/auth/identity without Bearer must be 401."""
    r = requests.get(f"{API}/api/auth/identity", timeout=10)
    assert r.status_code == 401, r.status_code


def t_identity_first_call_creates_triple():
    """First call → is_new_user true; creates user + workspace + owner membership."""
    r = _identity()
    assert r.status_code == 200, f"identity 1st call: {r.status_code} {r.text}"
    body = r.json()
    assert set(body.keys()) >= {"user", "organization", "membership", "is_new_user"}, body.keys()
    assert body["is_new_user"] is True, body
    state["identity_1"] = body
    # Validate user shape
    u = body["user"]
    for k in ("id", "cognito_sub", "email", "role", "status", "created_at"):
        assert u.get(k), f"user missing {k}: {u}"
    assert u["email"].lower() == EMAIL.lower()
    # Validate org shape
    o = body["organization"]
    for k in ("id", "name", "slug", "plan", "owner_user_id", "created_at"):
        assert o.get(k), f"organization missing {k}: {o}"
    # Owner_user_id must equal user.id
    assert o["owner_user_id"] == u["id"], f"owner != user: {o['owner_user_id']} vs {u['id']}"
    # Validate membership shape
    m = body["membership"]
    for k in ("id", "organization_id", "user_id", "role", "status"):
        assert m.get(k), f"membership missing {k}: {m}"
    assert m["organization_id"] == o["id"]
    assert m["user_id"] == u["id"]
    assert m["role"] == "owner", f"first member role must be owner, got {m['role']}"
    assert m["status"] == "active"


def t_workspace_name_derived_from_first_name():
    """Workspace name should be derived from first name, not the Cognito sub."""
    o = state["identity_1"]["organization"]
    # "Alice Tester" → "Alice Workspace"
    assert o["name"] == "Alice Workspace", f"unexpected org name: {o['name']!r}"
    # slug should NOT contain the Cognito UUID
    sub = state["identity_1"]["user"]["cognito_sub"]
    assert sub not in o["slug"], f"slug leaks cognito sub: {o['slug']!r}"


def t_identity_second_call_is_idempotent():
    """Second call must return SAME ids and is_new_user=false."""
    r = _identity()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_new_user"] is False, "is_new_user must flip false on 2nd call"
    assert body["user"]["id"] == state["identity_1"]["user"]["id"]
    assert body["organization"]["id"] == state["identity_1"]["organization"]["id"]
    assert body["membership"]["id"] == state["identity_1"]["membership"]["id"]


# ───────── DB-level verification ─────────


async def t_db_rows_persisted():
    """Verify exactly 1 user, 1 org, 1 membership were created."""
    from app.database.session import engine
    user_id = state["identity_1"]["user"]["id"]
    org_id = state["identity_1"]["organization"]["id"]
    async with engine.connect() as conn:
        u = (await conn.execute(
            text("SELECT cognito_sub, email, role, status FROM users WHERE id=:id"),
            {"id": user_id},
        )).first()
        assert u, "user row missing"
        assert u.email.lower() == EMAIL.lower()
        assert u.role == "owner", u.role
        assert u.status == "active", u.status

        o = (await conn.execute(
            text("SELECT name, slug, plan, owner_user_id FROM organizations WHERE id=:id"),
            {"id": org_id},
        )).first()
        assert o, "org row missing"
        assert o.plan == "free"
        assert str(o.owner_user_id) == user_id

        m = (await conn.execute(
            text("SELECT role, status, joined_at FROM organization_members "
                 "WHERE organization_id=:o AND user_id=:u"),
            {"o": org_id, "u": user_id},
        )).first()
        assert m, "membership row missing"
        assert m.role == "owner", m.role
        assert m.status == "active", m.status
        assert m.joined_at is not None, "joined_at not stamped"


# ───────── cleanup ─────────


async def cleanup():
    from app.database.session import engine
    user_id = state.get("identity_1", {}).get("user", {}).get("id")
    if user_id:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM organization_members WHERE user_id=:u"), {"u": user_id})
            await conn.execute(text("DELETE FROM organizations WHERE owner_user_id=:u"), {"u": user_id})
            await conn.execute(text("DELETE FROM users WHERE id=:u"), {"u": user_id})
    try:
        cognito.admin_delete_user(UserPoolId=USER_POOL_ID, Username=EMAIL)
    except ClientError:
        pass


# ───────── run ─────────


if __name__ == "__main__":
    print(f"API = {API}")
    print(f"DATABASE_URL = {os.environ.get('DATABASE_URL', '<unset>')}")
    print(f"Test email = {EMAIL}")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    tests = [
        ("Schema columns present on users/organizations/organization_members", t_schema_columns),
        ("Signup + admin-confirm Cognito user", t_signup_and_confirm),
        ("Login returns access token", t_login_and_keep_token),
        ("GET /api/auth/identity unauth → 401", t_identity_unauth),
        ("First /api/auth/identity creates user+org+owner-membership", t_identity_first_call_creates_triple),
        ("Workspace name derived from first name (not Cognito sub)", t_workspace_name_derived_from_first_name),
        ("Second call is idempotent (is_new_user=false, same ids)", t_identity_second_call_is_idempotent),
        ("DB persistence: 1 user + 1 org + 1 owner membership", t_db_rows_persisted),
    ]

    try:
        for name, fn in tests:
            step(name, fn, loop=loop)
    finally:
        try:
            loop.run_until_complete(cleanup())
        finally:
            loop.close()

    print("\n" + "=" * 64)
    print(f"PASSED: {len(PASS)}/{len(tests)}")
    for n in PASS:
        print(f"  ✓ {n}")
    if FAIL:
        print(f"\nFAILED: {len(FAIL)}")
        for n, e in FAIL:
            print(f"  ✗ {n}\n      {e}")
        sys.exit(1)
    print("\n🎉 All Phase 3 identity checks PASSED.")
