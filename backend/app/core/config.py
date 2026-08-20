"""Centralized configuration for the auth foundation.

Authentication is self-hosted (Argon2 + JWT, see app/core/security.py) —
no AWS Cognito dependency. AWS credentials (used only by the optional
Bedrock embeddings provider) are *not* read here — boto3 uses its default
credential chain (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION env
vars or attached IAM role).

Fail-fast policy: required values raise at import time if missing. This
prevents silently booting with a weak/default JWT secret in production.
"""
import os
from pathlib import Path

from dotenv import load_dotenv


# Always load backend/.env regardless of current working directory.
# override=True: this file must always win over stray OS/user env vars
# (e.g. a pre-existing OPENAI_API_KEY from an unrelated tool/project).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_BACKEND_ROOT / ".env", override=True)


def _required(key: str, *aliases: str) -> str:
    """Return the value of `key` (or first matching alias), else raise."""
    for k in (key, *aliases):
        value = os.environ.get(k)
        if value:
            return value
    aliases_str = f" (aliases: {', '.join(aliases)})" if aliases else ""
    raise RuntimeError(
        f"Missing required environment variable: {key}{aliases_str}. "
        f"Set it in backend/.env before starting the server."
    )


class Settings:
    #: Optional — only consulted as a region fallback for the Bedrock
    #: embeddings provider and S3/SES if those are configured.
    aws_region: str = os.environ.get("AWS_REGION", "us-east-1")

    # ---- Self-hosted JWT auth ----
    jwt_secret_key: str = _required("JWT_SECRET_KEY", "LOCAL_AUTH_SECRET")
    jwt_access_ttl_minutes: int = int(os.environ.get("JWT_ACCESS_TTL_MINUTES", "15"))
    jwt_refresh_ttl_days: int = int(os.environ.get("JWT_REFRESH_TTL_DAYS", "30"))
    jwt_leeway_seconds: int = int(os.environ.get("JWT_LEEWAY_SECONDS", "60"))
    jwt_issuer_name: str = os.environ.get("JWT_ISSUER", "oraone-api")

    def __init__(self) -> None:
        if len(self.jwt_secret_key) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY must be at least 32 characters. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )

    @property
    def jwt_issuer(self) -> str:
        return self.jwt_issuer_name


settings = Settings()
