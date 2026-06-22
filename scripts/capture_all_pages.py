"""
Capture full-page screenshots of every OraOne route at desktop (and optionally mobile) widths.
Outputs into /app/docs/qa/test_reports/screenshots/{desktop,mobile}/<slug>.png

Run: python3 /app/scripts/capture_all_pages.py [--desktop-only]
"""
import asyncio
import os
import sys
import json
from pathlib import Path
from playwright.async_api import async_playwright

# Read the preview URL from frontend/.env so we don't hardcode it.
def _read_base():
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return "http://localhost:3000"

BASE = os.environ.get("ORAONE_BASE_URL") or _read_base()
EMAIL = "admin@oraone.in"
PASSWORD = "OraOne@2026"
DESKTOP_ONLY = "--desktop-only" in sys.argv

OUT_DIR = Path("/app/docs/qa/test_reports/screenshots")
(OUT_DIR / "desktop").mkdir(parents=True, exist_ok=True)
(OUT_DIR / "mobile").mkdir(parents=True, exist_ok=True)

ROUTES = [
    # Marketing
    ("home", "/"),
    ("products", "/products"),
    ("solutions", "/solutions"),
    ("integrations-marketing", "/integrations"),
    ("templates", "/templates"),
    ("pricing", "/pricing"),
    ("security", "/security"),
    ("documentation", "/documentation"),
    ("case-studies", "/case-studies"),
    ("about", "/about"),
    ("contact", "/contact"),
    # Legal
    ("privacy", "/privacy"),
    ("terms", "/terms"),
    ("cookie-policy", "/cookie-policy"),
    ("data-deletion", "/data-deletion"),
    # Auth
    ("login", "/login"),
    ("signup", "/signup"),
    ("forgot-password", "/forgot-password"),
    ("verify-email", "/verify-email"),
    ("reset-password", "/reset-password"),
    # Error
    ("404-not-found", "/this-path-does-not-exist"),
    ("500-server-error", "/500"),
    # Onboarding (requires auth)
    ("onboarding-agent", "/onboarding/agent"),
    ("onboarding-business", "/onboarding/business"),
    ("onboarding-channels", "/onboarding/channels"),
    # Dashboard (requires auth)
    ("dashboard-overview", "/app/overview"),
    ("dashboard-agents", "/app/agents"),
    ("dashboard-agent-create", "/app/agents/new"),
    ("dashboard-conversations", "/app/conversations"),
    ("dashboard-leads", "/app/leads"),
    ("dashboard-analytics", "/app/analytics"),
    ("dashboard-integrations", "/app/integrations"),
    ("dashboard-knowledge-base", "/app/knowledge-base"),
    ("dashboard-team", "/app/team"),
    ("dashboard-settings", "/app/settings"),
]


async def capture(page, slug, path, out_dir):
    url = f"{BASE}{path}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)  # let lazy chunks + charts render
        target = out_dir / f"{slug}.png"
        await page.screenshot(path=str(target), full_page=True, type="png")
        return {"slug": slug, "url": url, "ok": True, "file": str(target)}
    except Exception as e:
        return {"slug": slug, "url": url, "ok": False, "error": str(e)[:200]}


async def get_token(context):
    """POST /api/auth/login and return access_token."""
    resp = await context.request.post(
        f"{BASE}/api/auth/login",
        data={"email": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    data = await resp.json()
    return data.get("access_token")


async def run_for_viewport(playwright, viewport, label, results):
    browser = await playwright.chromium.launch()
    context = await browser.new_context(viewport=viewport)

    # Pre-seed localStorage with the auth token so /app/* + /onboarding/* don't redirect
    token = await get_token(context)
    if token:
        await context.add_init_script(
            f"window.localStorage.setItem('oraone_access_token', '{token}');"
        )

    page = await context.new_page()
    out_dir = OUT_DIR / label

    for slug, path in ROUTES:
        res = await capture(page, slug, path, out_dir)
        results.setdefault(label, []).append(res)
        status = "OK" if res["ok"] else "FAIL"
        print(f"  [{label}] {status}  {slug}  {path}")

    await context.close()
    await browser.close()


async def main():
    results = {}
    async with async_playwright() as pw:
        print(f"=== BASE: {BASE} ===")
        print("=== Desktop 1440x900 ===")
        await run_for_viewport(pw, {"width": 1440, "height": 900}, "desktop", results)
        if not DESKTOP_ONLY:
            print("=== Mobile 390x844 ===")
            await run_for_viewport(pw, {"width": 390, "height": 844}, "mobile", results)

    # Summary
    summary = {
        "base_url": BASE,
        "routes_captured": len(ROUTES),
        "results": results,
        "totals": {
            label: {
                "ok": sum(1 for r in items if r["ok"]),
                "fail": sum(1 for r in items if not r["ok"]),
            }
            for label, items in results.items()
        },
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    print("\nSummary written to", OUT_DIR / "summary.json")
    print(json.dumps(summary["totals"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())
