"""
Polish pass verification tests:
- Backend security headers
- Auth still works end-to-end (login + /auth/me)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")

ADMIN_EMAIL = "admin@oraone.in"
ADMIN_PASSWORD = "OraOne@2026"


# ---------- Security headers ----------
class TestSecurityHeaders:
    def test_security_headers_on_api_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200, f"Unexpected status {r.status_code}"
        h = {k.lower(): v for k, v in r.headers.items()}
        assert h.get("x-frame-options") == "DENY", f"x-frame-options={h.get('x-frame-options')}"
        assert h.get("x-content-type-options") == "nosniff"
        assert h.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in (h.get("permissions-policy") or "")
        assert h.get("cross-origin-opener-policy") == "same-origin"
        # X-XSS-Protection should be set (modern value is "0")
        assert "x-xss-protection" in h

    def test_security_headers_on_auth_login_response(self):
        # Send an invalid login to confirm headers still apply on error paths
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@example.com", "password": "wrong"},
            timeout=15,
        )
        h = {k.lower(): v for k, v in r.headers.items()}
        assert h.get("x-frame-options") == "DENY"
        assert h.get("x-content-type-options") == "nosniff"


# ---------- Auth end-to-end ----------
class TestAuth:
    @pytest.fixture(scope="class")
    def access_token(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 10
        return data["access_token"]

    def test_login_returns_access_token(self, access_token):
        assert access_token

    def test_me_with_bearer(self, access_token):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        assert r.status_code == 200, f"/me failed: {r.status_code} {r.text}"
        user = r.json()
        assert user.get("email") == ADMIN_EMAIL
        # Security headers still present on authenticated route
        h = {k.lower(): v for k, v in r.headers.items()}
        assert h.get("x-frame-options") == "DENY"


# ---------- Marketing HTML JSON-LD ----------
class TestMarketingJsonLd:
    def test_three_jsonld_blocks_in_index_html(self):
        r = requests.get(f"{BASE_URL}/", timeout=20)
        assert r.status_code == 200
        count = r.text.count('application/ld+json')
        assert count == 3, f"Expected 3 ld+json blocks, found {count}"
        # Sanity check each type tag exists
        assert '"Organization"' in r.text
        assert '"WebSite"' in r.text
        assert '"SoftwareApplication"' in r.text
