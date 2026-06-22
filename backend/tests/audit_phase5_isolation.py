"""Phase 5 — live tenant-isolation audit against the running backend.

Creates two real Cognito users (alice + bob), provisions each via
/api/auth/identity, has Alice create an agent, then proves Bob cannot
see or touch it through any HTTP route.

Run:
  API_BASE_URL=https://your-domain python tests/audit_phase5_isolation.py
"""
import os
import sys
import uuid
from pathlib import Path

import boto3
import requests
from botocore.exceptions import ClientError
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

API = os.environ.get("API_BASE_URL", "http://localhost:8000")
REGION = os.environ["AWS_REGION"]
POOL = os.environ["COGNITO_USER_POOL_ID"]
cognito = boto3.client("cognito-idp", region_name=REGION)

PASS, FAIL = [], []


def step(name, fn):
    print(f"\n▶ {name}")
    try:
        fn()
        PASS.append(name)
        print("  ✓ OK")
    except AssertionError as e:
        FAIL.append((name, str(e))); print(f"  ✗ FAIL: {e}")
    except Exception as e:
        FAIL.append((name, f"{type(e).__name__}: {e}")); print(f"  ✗ ERR: {type(e).__name__}: {e}")


def _create_and_login(name: str) -> str:
    email = f"phase5-{name.lower()}+{uuid.uuid4().hex[:8]}@oraone-test.dev"
    pwd = "TestPhase5!2026"
    r = requests.post(f"{API}/api/auth/signup",
                      json={"email": email, "name": name, "password": pwd}, timeout=20)
    assert r.status_code == 200, r.text
    try:
        cognito.admin_confirm_sign_up(UserPoolId=POOL, Username=email)
    except ClientError as e:
        if e.response["Error"]["Code"] != "NotAuthorizedException":
            raise
    cognito.admin_update_user_attributes(UserPoolId=POOL, Username=email,
                                         UserAttributes=[{"Name": "email_verified", "Value": "true"}])
    r = requests.post(f"{API}/api/auth/login",
                      json={"email": email, "password": pwd}, timeout=20)
    assert r.status_code == 200, r.text
    return email, r.json()["access_token"]


def _hdr(t): return {"Authorization": f"Bearer {t}"}


state = {}


def t_setup():
    alice_email, alice_tok = _create_and_login("Alice")
    bob_email, bob_tok = _create_and_login("Bob")
    state["alice"] = (alice_email, alice_tok)
    state["bob"]   = (bob_email, bob_tok)
    # Provision identities → each gets a workspace
    a = requests.get(f"{API}/api/auth/identity", headers=_hdr(alice_tok)).json()
    b = requests.get(f"{API}/api/auth/identity", headers=_hdr(bob_tok)).json()
    assert a["organization"]["id"] != b["organization"]["id"], "orgs collided!"
    state["alice_org"] = a["organization"]["id"]
    state["bob_org"]   = b["organization"]["id"]


def t_alice_creates_agent():
    _, tok = state["alice"]
    r = requests.post(
        f"{API}/api/agents",
        headers=_hdr(tok),
        json={"name": "Alice secret agent", "type": "chat", "model": "gpt-4o-mini"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text
    state["alice_agent_id"] = r.json()["id"]


def t_bob_cannot_get_alices_agent():
    _, tok = state["bob"]
    r = requests.get(
        f"{API}/api/agents/{state['alice_agent_id']}", headers=_hdr(tok), timeout=10
    )
    assert r.status_code == 404, f"LEAK! Bob got {r.status_code}: {r.text}"


def t_bob_cannot_delete_alices_agent():
    _, tok = state["bob"]
    r = requests.delete(
        f"{API}/api/agents/{state['alice_agent_id']}", headers=_hdr(tok), timeout=10
    )
    assert r.status_code == 404, f"LEAK on delete! Bob got {r.status_code}: {r.text}"


def t_bob_list_excludes_alices_agent():
    _, tok = state["bob"]
    r = requests.get(f"{API}/api/agents", headers=_hdr(tok), timeout=10)
    assert r.status_code == 200, r.text
    ids = [a["id"] for a in r.json().get("items", [])]
    assert state["alice_agent_id"] not in ids, f"LIST LEAK: {ids}"


def t_alice_can_still_get_her_own_agent():
    _, tok = state["alice"]
    r = requests.get(
        f"{API}/api/agents/{state['alice_agent_id']}", headers=_hdr(tok), timeout=10
    )
    assert r.status_code == 200, r.text


def t_xorgid_header_is_ignored():
    """Bob supplies X-Org-Id: <alice_org> — server must ignore client-supplied org."""
    _, tok = state["bob"]
    r = requests.get(
        f"{API}/api/agents/{state['alice_agent_id']}",
        headers={**_hdr(tok), "X-Org-Id": state["alice_org"]},
        timeout=10,
    )
    assert r.status_code == 404, f"SPOOF LEAK! Bob+X-Org-Id got {r.status_code}: {r.text}"


def cleanup():
    for who in ("alice", "bob"):
        email = state.get(who, (None, None))[0]
        if email:
            try:
                cognito.admin_delete_user(UserPoolId=POOL, Username=email)
            except ClientError:
                pass


if __name__ == "__main__":
    print(f"API = {API}")
    tests = [
        ("Provision Alice + Bob, get distinct orgs", t_setup),
        ("Alice creates an agent", t_alice_creates_agent),
        ("Bob GET /api/agents/{alice_id} → 404 (no read leak)", t_bob_cannot_get_alices_agent),
        ("Bob DELETE /api/agents/{alice_id} → 404 (no write leak)", t_bob_cannot_delete_alices_agent),
        ("Bob list excludes Alice's agent", t_bob_list_excludes_alices_agent),
        ("Alice can still fetch her own agent", t_alice_can_still_get_her_own_agent),
        ("X-Org-Id spoof header is ignored", t_xorgid_header_is_ignored),
    ]
    try:
        for n, fn in tests:
            step(n, fn)
    finally:
        cleanup()

    print("\n" + "=" * 64)
    print(f"PASSED: {len(PASS)}/{len(tests)}")
    for n in PASS:
        print(f"  ✓ {n}")
    if FAIL:
        print(f"\nFAILED: {len(FAIL)}")
        for n, e in FAIL:
            print(f"  ✗ {n}\n      {e}")
        sys.exit(1)
    print("\n🎉 All Phase 5 isolation checks PASSED.")
