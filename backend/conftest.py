"""Load .env for pytest before any `app.*` modules are imported.

`app.core.config` raises at import time if AWS_REGION / COGNITO_USER_POOL_ID /
COGNITO_CLIENT_ID aren't set. We want pytest to find them in `backend/.env`
just like uvicorn does at server start.
"""
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
