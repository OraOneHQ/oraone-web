"""Centralized configuration for the auth foundation.

Values are loaded from environment variables. AWS credentials are *not*
read here — boto3 uses its default credential chain (AWS_ACCESS_KEY_ID,
AWS_SECRET_ACCESS_KEY, AWS_REGION env vars or attached IAM role).

Fail-fast policy: required values raise at import time if missing. This
prevents silent fallback to a different AWS account/pool in production.
"""
import os


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
    aws_region: str = _required("AWS_REGION")
    cognito_user_pool_id: str = _required("COGNITO_USER_POOL_ID")
    cognito_app_client_id: str = _required("COGNITO_CLIENT_ID", "COGNITO_APP_CLIENT_ID")
    cognito_redirect_uri: str = os.environ.get(
        "COGNITO_REDIRECT_URI",
        "http://localhost:3000/auth/callback",
    )
    cognito_domain: str = os.environ.get("COGNITO_DOMAIN", "")
    dynamodb_users_table: str = os.environ.get("DYNAMODB_USERS_TABLE", "oraone-users")
    jwt_leeway_seconds: int = int(os.environ.get("JWT_LEEWAY_SECONDS", "60"))

    def __init__(self) -> None:
        # Compute cognito_domain only if not explicitly set. Cognito domains
        # are lowercased: ap-south-2_AbCdE → ap-south-2abcde.
        if not self.cognito_domain:
            pool_suffix = (
                self.cognito_user_pool_id.split("_", 1)[1].lower()
                if "_" in self.cognito_user_pool_id
                else self.cognito_user_pool_id.lower()
            )
            self.cognito_domain = (
                f"https://{self.aws_region}{pool_suffix}.auth.{self.aws_region}.amazoncognito.com"
            )

    @property
    def jwt_issuer(self) -> str:
        return f"https://cognito-idp.{self.aws_region}.amazonaws.com/{self.cognito_user_pool_id}"

    @property
    def jwks_url(self) -> str:
        return f"{self.jwt_issuer}/.well-known/jwks.json"


settings = Settings()
