import subprocess
from datetime import datetime, timezone

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.auth.routes import router as auth_router


app = FastAPI(title="OraOne Auth API", version="1.1.0")
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _git_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            cwd="/opt/oraone",
        ).decode().strip()
    except Exception:
        return "unknown"


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/version")
def version():
    return {
        "version": "1.1.0",
        "commit": _git_commit(),
        "deployed_at": datetime.now(timezone.utc).isoformat(),
        "environment": "production",
    }
