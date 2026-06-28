"""One-off LIVE outbound call test driver.

Places a real outbound call through the *running* backend (so the in-memory
voice session is created inside the server process that also handles the
Twilio media-stream WebSocket), retries up to 3 times until the callee
answers, monitors the call via Twilio's REST API, then saves the saved
conversation transcript to test_reports/.

Run from backend/:  python scripts/live_call_test.py
The login password is read with getpass and never printed.
"""
from __future__ import annotations

import datetime as dt
import getpass
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

API = os.environ.get("ORA_API", "http://127.0.0.1:8000/api")
EMAIL = os.environ.get("ORA_EMAIL", "varun.jakkampudi14@gmail.com")
TO_NUMBER = os.environ.get("ORA_TO", "+919390588823")
MAX_ATTEMPTS = 3
PER_ATTEMPT_TIMEOUT = 100  # seconds to wait for an answer per attempt
OUT_DIR = ROOT.parent / "test_reports"

TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")

CONNECTED = {"in-progress", "completed"}
RETRYABLE = {"busy", "no-answer", "failed", "canceled"}


def twilio_status(sid: str):
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls/{sid}.json"
    try:
        r = httpx.get(url, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=20)
    except httpx.HTTPError as e:
        return None, {"error": str(e)}
    if r.status_code >= 400:
        return None, {"http": r.status_code, "body": r.text[:300]}
    j = r.json()
    return j.get("status"), j


def main() -> int:
    if not (TWILIO_SID and TWILIO_TOKEN):
        print("ERROR: Twilio credentials missing from environment / .env")
        return 1

    pw = os.environ.get("ORA_PW") or getpass.getpass(f"Password for {EMAIL}: ")
    c = httpx.Client(timeout=40)

    # 1) Authenticate (Cognito USER_PASSWORD_AUTH via backend).
    r = c.post(f"{API}/auth/login", json={"email": EMAIL, "password": pw})
    if r.status_code != 200:
        print(f"LOGIN FAILED {r.status_code}: {r.text[:300]}")
        return 1
    access = r.json().get("access_token")
    if not access:
        print("LOGIN: no access_token in response")
        return 1
    H = {"Authorization": f"Bearer {access}"}
    print("Authenticated OK.")

    # 2) Pick an agent (prefer a voice/receptionist type).
    r = c.get(f"{API}/agents", headers=H)
    if r.status_code != 200:
        print(f"AGENTS FAILED {r.status_code}: {r.text[:200]}")
        return 1
    data = r.json()
    agents = data if isinstance(data, list) else data.get("items", [])
    if not agents:
        print("No agents found in this org. Create a voice agent first.")
        return 1
    agent = next(
        (a for a in agents if str(a.get("type", "")).lower() in ("voice", "receptionist", "phone")),
        agents[0],
    )
    agent_id = agent["id"]
    print(f"Using agent: {agent.get('name')} ({agent_id}) type={agent.get('type')}")

    # 3) Place the call, retrying until connected.
    call_id = None
    sid = None
    connected = False
    attempt_log = []

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n=== Attempt {attempt}/{MAX_ATTEMPTS}: dialing {TO_NUMBER} ===")
        r = c.post(
            f"{API}/voice/outgoing",
            headers=H,
            json={
                "agent_id": agent_id,
                "to_number": TO_NUMBER,
                "metadata": {"purpose": "live voice test", "attempt": attempt},
            },
        )
        if r.status_code not in (200, 201):
            print(f"  PLACE FAILED {r.status_code}: {r.text[:400]}")
            attempt_log.append({"attempt": attempt, "place_error": r.text[:400]})
            time.sleep(3)
            continue
        resp = r.json()
        call_id = resp.get("call_id")
        sid = resp.get("provider_call_sid")
        print(f"  call_id={call_id} sid={sid} status={resp.get('status')} msg={resp.get('message')}")
        if not sid:
            print(f"  No provider SID returned — telephony did not dial. {resp.get('message')}")
            attempt_log.append({"attempt": attempt, "no_sid": resp.get("message")})
            time.sleep(3)
            continue

        # Poll Twilio for the authoritative call status.
        deadline = time.time() + PER_ATTEMPT_TIMEOUT
        last = None
        final = None
        while time.time() < deadline:
            st, _raw = twilio_status(sid)
            if st != last:
                print(f"  twilio: {st}")
                last = st
            if st in CONNECTED:
                connected = True
            if st == "completed" or st in RETRYABLE:
                final = st
                break
            time.sleep(3)
        attempt_log.append({"attempt": attempt, "call_id": call_id, "sid": sid, "final": final or last})

        if connected:
            # Let the conversation run to completion.
            print("  Connected — waiting for the call to complete...")
            while True:
                st, _raw = twilio_status(sid)
                if st == "completed" or st in RETRYABLE:
                    print(f"  call ended: {st}")
                    break
                time.sleep(4)
            break
        else:
            print(f"  Not connected ({final or last}); retrying..." if attempt < MAX_ATTEMPTS else f"  Not connected ({final or last}).")
            time.sleep(2)

    # 4) Save the conversation transcript.
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    detail = None
    if call_id:
        r = c.get(f"{API}/voice/calls/{call_id}", headers=H)
        if r.status_code == 200:
            detail = r.json()

    json_path = OUT_DIR / f"voice_call_{stamp}.json"
    txt_path = OUT_DIR / f"voice_call_{stamp}.txt"

    payload = {
        "saved_at": dt.datetime.now().isoformat(),
        "to_number": TO_NUMBER,
        "agent_id": agent_id,
        "call_id": call_id,
        "provider_call_sid": sid,
        "connected": connected,
        "attempts": attempt_log,
        "call_detail": detail,
    }
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")

    lines = [
        f"Live voice call — {TO_NUMBER}",
        f"Saved: {payload['saved_at']}",
        f"Agent: {agent.get('name')} ({agent_id})",
        f"Call ID: {call_id}   Twilio SID: {sid}",
        f"Connected: {connected}",
        "",
    ]
    msgs = (detail or {}).get("messages") or []
    if msgs:
        lines.append("Transcript:")
        for m in sorted(msgs, key=lambda x: x.get("sequence", 0)):
            who = m.get("speaker", "?")
            lines.append(f"  [{who}] {m.get('text', '')}")
    else:
        lines.append("Transcript: (no turns were recorded)")
    if detail and detail.get("summary"):
        lines += ["", f"Summary: {detail['summary']}"]
    txt_path.write_text("\n".join(lines), encoding="utf-8")

    print("\n--- SAVED ---")
    print(f"  {json_path}")
    print(f"  {txt_path}")
    print(f"connected={connected} call_id={call_id} turns={len(msgs)}")
    return 0 if connected else 2


if __name__ == "__main__":
    sys.exit(main())
