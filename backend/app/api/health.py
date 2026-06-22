"""Health endpoints — application + database probes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.database.session import init_engine

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/db")
async def db_health() -> dict:
    """Postgres reachability probe.

    Returns 200 with `{status: 'healthy', database: 'connected'}` when the
    engine can run `SELECT 1` against RDS. Returns 503 with a clear error
    detail otherwise (e.g. when the preview pod can't see the private VPC).
    """
    try:
        engine = init_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        log.warning("DB health probe failed: %s: %s", type(e).__name__, e)
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "error": f"{type(e).__name__}: {e}",
            },
        )
