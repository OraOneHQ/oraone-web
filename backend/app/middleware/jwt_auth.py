"""Self-hosted JWT verification middleware (HS256, no external JWKS).

Every 401 from this module is logged with a precise reason at WARNING
level under the logger `app.auth.jwt`. Tail uvicorn output to see them.
"""
import logging
from typing import Any, Dict

from fastapi import HTTPException, Request, status
from jose import JWTError

from app.core.security import decode_access_token

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


def verify_access_token(token: str, request: Request | None = None) -> Dict[str, Any]:
    """Verify a self-issued access token and return its claims."""
    try:
        claims = decode_access_token(token)
    except JWTError as e:
        raise _unauthorized(f"invalid_token: {type(e).__name__}: {e}", request=request)

    log.info("AUTH OK sub=%s path=%s", claims.get("sub"), request.url.path if request else "?")
    return claims


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header:
        # Browser sessions may rely on the httpOnly access-token cookie instead
        # of an Authorization header (see app/core/cookies.py).
        from app.core.cookies import ACCESS_COOKIE_NAME

        cookie_token = request.cookies.get(ACCESS_COOKIE_NAME)
        if cookie_token:
            return cookie_token
        # Show all header names received (not values — could be sensitive) so
        # we can spot proxies that strip "Authorization".
        names = sorted(request.headers.keys())
        raise _unauthorized(
            f"no_authorization_header_or_cookie (received headers: {names})", request=request
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
    """FastAPI dependency: validates the Bearer token and returns its claims."""
    token = _extract_bearer_token(request)
    return verify_access_token(token, request=request)


async def get_current_access_token(request: Request) -> str:
    """FastAPI dependency that returns the validated raw access token."""
    token = _extract_bearer_token(request)
    verify_access_token(token, request=request)
    return token
