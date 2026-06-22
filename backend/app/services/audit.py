"""Audit logging (Phase 6).

Tiny helper that emits structured JSON log records via Python's stdlib
``logging`` to a dedicated logger (``app.audit``). The log handler /
sink is whatever uvicorn/supervisor is configured to ship — by default
stdout, which is good enough for CloudWatch / Loki / Datadog ingestion.

We deliberately do **not** write an ``audit_logs`` table yet — that's a
schema change that belongs in its own migration. When that table lands,
this module is the single place to flip from logger → DB insert.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger("app.audit")


def audit(
    action: str,
    *,
    resource: str,
    organization_id: str,
    user_id: str,
    resource_id: Optional[str] = None,
    before: Optional[dict[str, Any]] = None,
    after: Optional[dict[str, Any]] = None,
    meta: Optional[dict[str, Any]] = None,
) -> None:
    """Emit one structured audit record.

    Args:
        action: ``create`` / ``update`` / ``delete`` / ``read`` / etc.
        resource: Resource family (``agent`` / ``integration`` / …).
        resource_id: Stringified UUID of the affected row, if any.
        organization_id / user_id: Tenant + actor (stringified UUIDs).
        before / after: Field snapshots for diffing. Keep them small.
        meta: Arbitrary extras (search query, filter set, pagination, …).
    """
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "organization_id": organization_id,
        "user_id": user_id,
        "before": before,
        "after": after,
        "meta": meta,
    }
    # ``json.dumps(default=str)`` so UUIDs / datetimes / Enums don't blow up
    # the audit pipe if a caller forgets to stringify.
    log.info("AUDIT %s", json.dumps(record, default=str))
