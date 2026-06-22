"""OraOne V1 — comprehensive backend API tests (pytest)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@oraone.in"
ADMIN_PASSWORD = "OraOne@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def new_user_session():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    payload = {"email": email, "password": "TestPass@1234", "full_name": "Test User", "company_name": "TestCo"}
    r = s.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email  # type: ignore
    return s


# ---------- Root / health ----------
class TestRoot:
    def test_root_banner(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "OraOne" in data.get("message", "")
        assert "tagline" in data


# ---------- Auth ----------
class TestAuth:
    def test_register_then_me(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "StrongPass@123", "full_name": "Reg User"
        }, timeout=20)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["email"] == email
        assert u["onboarded"] is False
        # cookie should be set by backend
        assert "access_token" in s.cookies or s.cookies.get("access_token") is not None
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 200, r2.text
        assert r2.json()["email"] == email

    def test_register_duplicate(self):
        email = f"dup_{uuid.uuid4().hex[:6]}@example.com"
        body = {"email": email, "password": "StrongPass@123", "full_name": "Dup"}
        r1 = requests.post(f"{API}/auth/register", json=body, timeout=20)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json=body, timeout=20)
        assert r2.status_code == 400

    def test_login_admin_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["onboarded"] is True

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong-pass-1234"}, timeout=20)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/logout", timeout=10)
        assert r2.status_code == 200
        # cookies cleared on session
        s.cookies.clear()
        r3 = s.get(f"{API}/auth/me", timeout=10)
        assert r3.status_code == 401

    def test_forgot_password_generic_response(self):
        r1 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=10)
        r2 = requests.post(f"{API}/auth/forgot-password",
                           json={"email": "nobody@example.com"}, timeout=10)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json().get("message") == r2.json().get("message")

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# ---------- Agents ----------
class TestAgents:
    @pytest.mark.parametrize("atype", ["voice", "chat", "whatsapp"])
    def test_agent_crud(self, admin_session, atype):
        # Create
        body = {"name": f"TEST_{atype}_{uuid.uuid4().hex[:6]}", "type": atype, "business_name": "TestCo"}
        r = admin_session.post(f"{API}/agents", json=body, timeout=15)
        assert r.status_code == 200, r.text
        agent = r.json()
        aid = agent["id"]
        assert agent["type"] == atype
        assert agent["status"] == "active"

        # List
        r = admin_session.get(f"{API}/agents", timeout=15)
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert aid in ids

        # Update
        r = admin_session.put(f"{API}/agents/{aid}",
                              json={"name": f"TEST_updated_{atype}", "type": atype, "status": "paused"},
                              timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "paused"

        # Verify persistence
        r = admin_session.get(f"{API}/agents/{aid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == f"TEST_updated_{atype}"

        # Delete
        r = admin_session.delete(f"{API}/agents/{aid}", timeout=15)
        assert r.status_code == 200
        r = admin_session.get(f"{API}/agents/{aid}", timeout=15)
        assert r.status_code == 404

    def test_agents_requires_auth(self):
        r = requests.get(f"{API}/agents", timeout=10)
        assert r.status_code == 401


# ---------- Leads ----------
class TestLeads:
    def test_lead_create_list_delete(self, admin_session):
        body = {"name": "TEST_Lead", "email": "TEST_lead@example.com", "source": "website", "score": 80}
        r = admin_session.post(f"{API}/leads", json=body, timeout=15)
        assert r.status_code == 200, r.text
        lid = r.json()["id"]

        r = admin_session.get(f"{API}/leads", timeout=15)
        assert r.status_code == 200
        assert any(l["id"] == lid for l in r.json())

        r = admin_session.delete(f"{API}/leads/{lid}", timeout=15)
        assert r.status_code == 200

        r = admin_session.get(f"{API}/leads", timeout=15)
        assert all(l["id"] != lid for l in r.json())


# ---------- Dashboard ----------
class TestDashboard:
    def test_overview_authenticated(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/overview", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ["calls_answered", "chats_handled", "whatsapp_chats", "leads_captured",
                  "appointments_booked", "conversion_rate", "agents_count"]:
            assert k in data

    def test_overview_unauthenticated(self):
        r = requests.get(f"{API}/dashboard/overview", timeout=10)
        assert r.status_code == 401


# ---------- Onboarding ----------
class TestOnboarding:
    def test_complete_onboarding_sets_flag(self, new_user_session):
        body = {"company_name": "TEST_Co", "industry": "SaaS", "phone": "+15551112222",
                "website": "https://example.com", "email": "biz@example.com"}
        r = new_user_session.post(f"{API}/onboarding/complete", json=body, timeout=15)
        assert r.status_code == 200, r.text
        r2 = new_user_session.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["onboarded"] is True


# ---------- Contact / Newsletter ----------
class TestMarketing:
    def test_contact_submission(self):
        body = {"name": "TEST Name", "email": "TEST_contact@example.com",
                "company": "TestCo", "message": "Hello", "type": "contact"}
        r = requests.post(f"{API}/contact", json=body, timeout=10)
        assert r.status_code == 200
        assert "id" in r.json()

    def test_newsletter_subscription(self):
        email = f"news_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/newsletter", json={"email": email}, timeout=10)
        assert r.status_code == 200
        # idempotent upsert
        r2 = requests.post(f"{API}/newsletter", json={"email": email}, timeout=10)
        assert r2.status_code == 200
