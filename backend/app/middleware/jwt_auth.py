"""Cognito JWT verification middleware (JWKS-based, no shared secret).

Follows AWS guidance: fetch JWKS, locate key by `kid`, verify signature,
then validate `exp`, `iss`, `aud`/`client_id` and `token_use`.

Every 401 from this module is logged with a precise reason at WARNING
level under the logger `app.auth.jwt`. Tail uvicorn output to see them.
"""
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict
import logging

import httpx
from fastapi import HTTPException, Request, status
from jose import jwk, jwt as jose_jwt
from jose.utils import base64url_decode

from app.core.config import settings

log = logging.getLogger("app.auth.jwt")


def _unauthorized(reason: str, *, request: Request | None = None) -> HTTPException:
    """Log the *real* reason then raise the generic 401."""
    path = request.url.path if request is not None else "?"
    log.warning("AUTH 401 path=%s reason=%s", path, reason)
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@lru_cache(maxsize=1)
def _fetch_jwks() -> Dict[str, Any]:
    log.info("Fetching Cognito JWKS from %s", settings.jwks_url)
    with httpx.Client(timeout=5.0) as client:
        resp = client.get(settings.jwks_url)
        resp.raise_for_status()
        data = resp.json()
    log.info("JWKS loaded: %d keys", len(data.get("keys", [])))
    return data


def _get_public_key(token: str, request: Request | None = None) -> Dict[str, Any]:
    try:
        headers = jose_jwt.get_unverified_header(token)
    except Exception as e:
        raise _unauthorized(f"malformed_token_header: {type(e).__name__}: {e}", request=request)
    kid = headers.get("kid")
    if not kid:
        raise _unauthorized("missing_kid_in_token_header", request=request)

    try:
        jwks = _fetch_jwks()
    except Exception as e:
        # JWKS endpoint unreachable — most common cause of "Not authenticated."
        # on a fresh EC2 with restricted egress.
        _fetch_jwks.cache_clear()
        raise _unauthorized(
            f"jwks_fetch_failed: {type(e).__name__}: {e} (url={settings.jwks_url})",
            request=request,
        )

    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    # Key rotation — refresh JWKS once and retry.
    _fetch_jwks.cache_clear()
    try:
        jwks = _fetch_jwks()
    except Exception as e:
        raise _unauthorized(
            f"jwks_refresh_failed: {type(e).__name__}: {e}", request=request
        )
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise _unauthorized(
        f"kid_not_in_jwks (kid={kid}, known_kids={[k.get('kid') for k in jwks.get('keys', [])]})",
        request=request,
    )


def verify_cognito_token(token: str, request: Request | None = None) -> Dict[str, Any]:
    """Verify a Cognito-issued access token and return claims."""
    log.debug("Verifying token (len=%d)", len(token))
    public_key_dict = _get_public_key(token, request=request)
    key_obj = jwk.construct(public_key_dict)

    try:
        message, encoded_sig = token.rsplit(".", 1)
        decoded_sig = base64url_decode(encoded_sig.encode("utf-8"))
    except Exception as e:
        raise _unauthorized(f"split_failed: {type(e).__name__}: {e}", request=request)

    if not key_obj.verify(message.encode("utf-8"), decoded_sig):
        raise _unauthorized("signature_verification_failed", request=request)

    try:
        claims = jose_jwt.get_unverified_claims(token)
    except Exception as e:
        raise _unauthorized(f"claims_decode_failed: {type(e).__name__}: {e}", request=request)

    # exp
    exp = claims.get("exp")
    if not isinstance(exp, (int, float)):
        raise _unauthorized(f"exp_missing_or_invalid: {exp!r}", request=request)
    if datetime.now(timezone.utc).timestamp() > exp + settings.jwt_leeway_seconds:
        log.warning("AUTH 401 path=%s reason=token_expired (exp=%s)",
                    request.url.path if request else "?", exp)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # iss
    if claims.get("iss") != settings.jwt_issuer:
        raise _unauthorized(
            f"iss_mismatch (got={claims.get('iss')!r}, expected={settings.jwt_issuer!r})",
            request=request,
        )

    # token_use must be 'access'
    if claims.get("token_use") != "access":
        raise _unauthorized(
            f"token_use_mismatch (got={claims.get('token_use')!r}, expected='access')",
            request=request,
        )

    # access tokens use 'client_id'
    if claims.get("client_id") != settings.cognito_app_client_id:
        raise _unauthorized(
            f"client_id_mismatch (got={claims.get('client_id')!r}, "
            f"expected={settings.cognito_app_client_id!r})",
            request=request,
        )

    log.info("AUTH OK sub=%s path=%s",
             claims.get("sub"),
             request.url.path if request else "?")
    return claims


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header:
        # Show all header names received (not values — could be sensitive) so
        # we can spot proxies that strip "Authorization".
        names = sorted(request.headers.keys())
        raise _unauthorized(
            f"no_authorization_header (received headers: {names})", request=request
        )
    if not auth_header.lower().startswith("bearer "):
        raise _unauthorized(
            f"authorization_not_bearer (prefix={auth_header[:20]!r})", request=request
        )
    token = auth_header[7:].strip()
    if not token:
        raise _unauthorized("empty_token_after_bearer", request=request)
    return token


async def get_current_user_claims(request: Request) -> Dict[str, Any]:
    """FastAPI dependency: validates Bearer token and returns Cognito claims."""
    token = _extract_bearer_token(request)
    return verify_cognito_token(token, request=request)


async def get_current_access_token(request: Request) -> str:
    """FastAPI dependency that returns the validated raw access token."""
    token = _extract_bearer_token(request)
    verify_cognito_token(token, request=request)
    return token
