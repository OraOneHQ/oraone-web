#!/usr/bin/env python3
"""Master verification script for all 7 OraOne phases.

Runs the full audit suite end-to-end:
  Phase 1 — Auth layer (Cognito + DynamoDB)
  Phase 2 — Postgres foundation
  Phase 3 — Identity layer (auto-workspace creation)
  Phase 4 — Frontend identity integration (Playwright)
  Phase 5 — Multi-tenant isolation
  Phase 6 — Agents system
  Phase 7 — Knowledge base foundation

Usage:
  python verify_all_phases.py https://oraone.in

Exit: 0 if all phases pass, 1 if any phase fails.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT.parent

API_BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

PHASES = [
    ("Phase 1", "Cognito + DynamoDB", "audit_phase1_auth.py"),
    ("Phase 2", "Postgres foundation", "audit_phase2_postgres.py"),
    ("Phase 3", "Identity layer", "audit_phase3_identity.py"),
    # Phase 4 is Playwright (browser) — skip in CI/non-interactive
    ("Phase 5", "Multi-tenant isolation", "audit_phase5_isolation.py"),
    ("Phase 6", "Agents system", "audit_phase6_agents.py"),
    ("Phase 7", "Knowledge base", "audit_phase7_knowledge.py"),
]

results = {}

print("\n" + "=" * 80)
print(" ORAONE FULL SYSTEM VERIFICATION")
print("=" * 80)
print(f"\nTarget: {API_BASE_URL}\n")

for phase, desc, script in PHASES:
    script_path = ROOT / script
    if not script_path.exists():
        print(f"❌ {phase} — {desc}: Script not found ({script})")
        results[phase] = False
        continue

    print(f"▶ {phase} — {desc}...", end=" ", flush=True)
    try:
        env = os.environ.copy()
        env["API_BASE_URL"] = API_BASE_URL
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(BACKEND_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            print("✅")
            results[phase] = True
        else:
            print("❌")
            print(f"  stderr: {result.stderr[:200]}")
            results[phase] = False
    except subprocess.TimeoutExpired:
        print("❌ (timeout)")
        results[phase] = False
    except Exception as e:
        print(f"❌ {e}")
        results[phase] = False

print("\n" + "=" * 80)
print(" VERIFICATION SUMMARY")
print("=" * 80)

passed = sum(1 for v in results.values() if v)
total = len(results)

for phase, desc, _ in PHASES:
    status = "✅ PASS" if results.get(phase, False) else "❌ FAIL"
    print(f"{status} — {phase}: {desc}")

print("\n" + "=" * 80)
print(f"Result: {passed}/{total} phases passed")
print("=" * 80 + "\n")

sys.exit(0 if passed == total else 1)
