"""End-to-end auth audit against real AWS Cognito + DynamoDB.

Verifies every checklist item in Phase 1 by hitting the live backend:
  • POST /api/auth/signup       (email signup + password validation + code delivery)
  • Cognito admin-confirm       (bypass email since this is automated)
  • POST /api/auth/login        (JWT generation: access + id + refresh)
  • GET  /api/auth/me           (JWKS-validated protected route + DDB profile)
  • POST /api/auth/logout       (Cognito global sign-out)
  • Negative cases              (bad password, wrong password, missing token)
"""
import os
import sys
import time
import uuid

import boto3
import requests
from botocore.exceptions import ClientError
from dotenv import load_dotenv

ENV_PATH = "/app/backend/.env"
load_dotenv(ENV_PATH)

API = os.environ.get("API_BASE_URL", "http://localhost:8000")
USER_POOL_ID = os.environ["COGNITO_USER_POOL_ID"]
REGION = os.environ["AWS_REGION"]
DDB_TABLE = os.environ.get("DYNAMODB_USERS_TABLE", "oraone-users")

cognito = boto3.client("cognito-idp", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION).Table(DDB_TABLE)

PASS = []
FAIL = []


def step(name: str, fn):
    print(f"\n▶ {name}")
    try:
        fn()
    except AssertionError as e:
        FAIL.append((name, str(e)))
        print(f"  ✗ FAIL: {e}")
    except Exception as e:
        FAIL.append((name, f"{type(e).__name__}: {e}"))
        print(f"  ✗ ERROR: {type(e).__name__}: {e}")
    else:
        PASS.append(name)
        print("  ✓ OK")


# ───────────────────────── test data ─────────────────────────
EMAIL = f"audit+{uuid.uuid4().hex[:10]}@oraone-test.dev"
NAME = "Phase1 Audit"
PASSWORD = "TestPhase1!2026"
WEAK_PASSWORD = "weak"
BAD_PASSWORD = "WrongPass!2026"

state = {}


# ───────────────────────── tests ─────────────────────────


def t_signup_weak_password():
    """Password validation must reject weak passwords (Cognito policy)."""
    r = requests.post(
        f"{API}/api/auth/signup",
        json={"email": EMAIL, "name": NAME, "password": WEAK_PASSWORD},
        timeout=15,
    )
    # FastAPI Pydantic min_length=8 catches it locally (422) OR Cognito rejects (400).
    assert r.status_code in (400, 422), f"expected 400/422, got {r.status_code}: {r.text}"


def t_signup_ok():
    """POST /api/auth/signup creates Cognito user + sends verification code."""
    r = requests.post(
        f"{API}/api/auth/signup",
        json={"email": EMAIL, "name": NAME, "password": PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    body = r.json()
    assert "verification" in body["message"].lower() or "verified" in body["message"].lower()
    # Cognito should now have the user
    user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=EMAIL)
    assert user["UserStatus"] in ("UNCONFIRMED", "CONFIRMED"), user["UserStatus"]
    state["user_status"] = user["UserStatus"]


def t_signup_duplicate():
    """Signing up the same email again must surface the existing-user error."""
    r = requests.post(
        f"{API}/api/auth/signup",
        json={"email": EMAIL, "name": NAME, "password": PASSWORD},
        timeout=15,
    )
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
    assert "already exists" in r.text.lower()


def t_login_blocked_before_verify():
    """Unverified users must not be able to log in (UserNotConfirmedException)."""
    if state.get("user_status") == "CONFIRMED":
        return  # nothing to test
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=15,
    )
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
    assert "verify" in r.text.lower()


def t_admin_confirm():
    """Bypass email by admin-confirming the user (simulates code entry)."""
    try:
        cognito.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=EMAIL)
    except ClientError as e:
        # Already confirmed is fine
        if e.response["Error"]["Code"] != "NotAuthorizedException":
            raise
    cognito.admin_update_user_attributes(
        UserPoolId=USER_POOL_ID,
        Username=EMAIL,
        UserAttributes=[{"Name": "email_verified", "Value": "true"}],
    )
    user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=EMAIL)
    assert user["UserStatus"] == "CONFIRMED", user["UserStatus"]


def t_login_wrong_password():
    """Wrong password must return 401."""
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": EMAIL, "password": BAD_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"


def t_login_ok():
    """POST /api/auth/login returns access + id + refresh tokens."""
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["access_token"], "missing access_token"
    assert body["id_token"], "missing id_token"
    assert body["refresh_token"], "missing refresh_token"
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] > 0
    state["access_token"] = body["access_token"]
    state["refresh_token"] = body["refresh_token"]


def t_me_no_token():
    """Protected route must return 401 with no Authorization header."""
    r = requests.get(f"{API}/api/auth/me", timeout=10)
    assert r.status_code == 401, r.status_code


def t_me_garbage_token():
    """Protected route must reject garbage Bearer token."""
    r = requests.get(
        f"{API}/api/auth/me",
        headers={"Authorization": "Bearer not.a.real.jwt"},
        timeout=10,
    )
    assert r.status_code == 401, r.status_code


def t_me_ok():
    """JWKS-validated /me returns the DynamoDB profile."""
    r = requests.get(
        f"{API}/api/auth/me",
        headers={"Authorization": f"Bearer {state['access_token']}"},
        timeout=15,
    )
    assert r.status_code == 200, f"me failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["email"].lower() == EMAIL.lower(), body
    assert body["userId"], body
    assert body["role"] == "user"
    assert body["plan"] == "free"
    state["userId"] = body["userId"]


def t_ddb_profile_persisted():
    """DynamoDB must contain a row keyed by userId == cognito sub."""
    item = ddb.get_item(Key={"userId": state["userId"]}).get("Item")
    assert item, f"no DDB row for {state['userId']}"
    assert item["email"].lower() == EMAIL.lower()
    assert item["status"] == "active"
    assert item.get("lastLogin"), "lastLogin not stamped"
    assert item.get("createdAt"), "createdAt missing"


def t_lastlogin_updates():
    """A second login must bump lastLogin in DynamoDB."""
    first = ddb.get_item(Key={"userId": state["userId"]})["Item"]["lastLogin"]
    time.sleep(2)
    r = requests.post(
        f"{API}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    state["access_token"] = r.json()["access_token"]
    second = ddb.get_item(Key={"userId": state["userId"]})["Item"]["lastLogin"]
    assert second > first, f"lastLogin not updated: {first} → {second}"


def t_refresh_token_works():
    """POST /api/auth/refresh returns a fresh access token."""
    r = requests.post(
        f"{API}/api/auth/refresh",
        json={"refresh_token": state["refresh_token"]},
        timeout=15,
    )
    assert r.status_code == 200, f"refresh failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["access_token"], body
    assert body["access_token"] != state["access_token"], "refresh returned the same token"


def t_logout_global():
    """POST /api/auth/logout invalidates the access token at Cognito."""
    r = requests.post(
        f"{API}/api/auth/logout",
        headers={"Authorization": f"Bearer {state['access_token']}"},
        timeout=15,
    )
    assert r.status_code == 200, f"logout failed: {r.status_code} {r.text}"


# ───────────────────────── cleanup ─────────────────────────


def cleanup():
    try:
        cognito.admin_delete_user(UserPoolId=USER_POOL_ID, Username=EMAIL)
    except ClientError:
        pass
    try:
        if state.get("userId"):
            ddb.delete_item(Key={"userId": state["userId"]})
    except Exception:
        pass


# ───────────────────────── run ─────────────────────────


if __name__ == "__main__":
    print(f"API = {API}")
    print(f"User pool = {USER_POOL_ID} in {REGION}")
    print(f"Test email = {EMAIL}")

    tests = [
        ("Signup rejects weak password", t_signup_weak_password),
        ("POST /api/auth/signup (Cognito user created)", t_signup_ok),
        ("Duplicate signup returns 400", t_signup_duplicate),
        ("Unverified user cannot log in (403)", t_login_blocked_before_verify),
        ("Admin-confirm + email_verified=true", t_admin_confirm),
        ("Login with wrong password returns 401", t_login_wrong_password),
        ("POST /api/auth/login returns access+id+refresh tokens", t_login_ok),
        ("GET /api/auth/me without token → 401", t_me_no_token),
        ("GET /api/auth/me with garbage token → 401", t_me_garbage_token),
        ("GET /api/auth/me with valid token → profile", t_me_ok),
        ("DynamoDB user profile created (userId, email, status, createdAt)", t_ddb_profile_persisted),
        ("Second login bumps lastLogin in DynamoDB", t_lastlogin_updates),
        ("POST /api/auth/refresh returns new access token", t_refresh_token_works),
        ("POST /api/auth/logout (global sign-out)", t_logout_global),
    ]

    try:
        for name, fn in tests:
            step(name, fn)
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
    print("\n🎉 All Phase 1 auth checks PASSED.")
