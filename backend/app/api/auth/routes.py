"""Auth API routes.

POST /api/auth/signup
POST /api/auth/verify
POST /api/auth/resend
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/logout
GET  /api/auth/me
"""
import logging
import re

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cognito import cognito_client
from app.database.dynamodb import users_table
from app.database.session import get_db
from app.middleware.jwt_auth import get_current_access_token, get_current_user_claims
from app.schemas.auth import (
    CodeExchangeRequest,
    ConfirmForgotPasswordRequest,
    ConfirmSignUpRequest,
    ForgotPasswordRequest,
    IdentityMembership,
    IdentityOrganization,
    IdentityResponse,
    IdentityUser,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResendConfirmationRequest,
    SignUpRequest,
    TokensResponse,
    UserProfile,
)
from app.services import IdentityService, auth_service, user_service


router = APIRouter(prefix="/api/auth", tags=["auth"])

log = logging.getLogger("app.auth.identity")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _looks_like_email(value: str | None) -> bool:
    return bool(value and _EMAIL_RE.match(value.strip()))


def _resolve_email_and_name(
    claims: dict, access_token: str
) -> tuple[str | None, str | None, str | None, str]:
    """Resolve a real email + display name(s) for the caller.

    Returns ``(email, full_name, given_name, source)``. Tries, in order:
      1. ``claims['email']`` (only id tokens carry it; access tokens don't)
      2. AWS Cognito ``GetUser`` API with the raw access token
      3. The existing DynamoDB user profile (keyed by sub == userId)

    Never falls back to ``sub`` / ``username`` (both are the Cognito UUID).
    """
    sub = claims.get("sub")

    # 1) Claims
    claim_email = (claims.get("email") or "").strip()
    if _looks_like_email(claim_email):
        full_name = claims.get("name") or None
        given_name = claims.get("given_name") or None
        return claim_email, full_name, given_name, "claims"

    # 2) Cognito GetUser
    try:
        resp = cognito_client.get_user(AccessToken=access_token)
        attrs = {a["Name"]: a["Value"] for a in resp.get("UserAttributes", [])}
        cognito_email = (attrs.get("email") or "").strip()
        if _looks_like_email(cognito_email):
            given_name = attrs.get("given_name") or None
            family_name = attrs.get("family_name") or None
            full_name = (
                attrs.get("name")
                or " ".join(p for p in [given_name, family_name] if p).strip()
                or None
            )
            return cognito_email, full_name, given_name, "cognito_get_user"
        log.warning(
            "identity_email_lookup sub=%s cognito_get_user returned no email (attrs=%s)",
            sub, list(attrs.keys()),
        )
    except (ClientError, BotoCoreError) as e:
        log.warning(
            "identity_email_lookup sub=%s cognito_get_user_failed: %s: %s",
            sub, type(e).__name__, e,
        )

    # 3) DynamoDB profile
    if sub:
        try:
            item = users_table.get_item(Key={"userId": sub}).get("Item") or {}
            ddb_email = (item.get("email") or "").strip()
            if _looks_like_email(ddb_email):
                return ddb_email, item.get("name") or None, item.get("given_name") or None, "dynamodb"
        except (ClientError, BotoCoreError) as e:
            log.warning(
                "identity_email_lookup sub=%s dynamodb_failed: %s: %s",
                sub, type(e).__name__, e,
            )

    return None, None, None, "unresolved"


@router.post("/signup", response_model=MessageResponse)
def signup(payload: SignUpRequest):
    result = auth_service.sign_up(payload)
    return MessageResponse(
        message=(
            "Verification code sent to your email."
            if not result.get("user_confirmed")
            else "Account created. You can now log in."
        )
    )


@router.post("/verify", response_model=MessageResponse)
def verify(payload: ConfirmSignUpRequest):
    auth_service.confirm_sign_up(payload)
    return MessageResponse(message="Email verified. You can now log in.")


@router.post("/resend", response_model=MessageResponse)
def resend(payload: ResendConfirmationRequest):
    auth_service.resend_confirmation_code(payload)
    return MessageResponse(message="A new verification code has been sent.")


@router.post("/login", response_model=TokensResponse)
def login(payload: LoginRequest):
    return auth_service.login(payload)


@router.post("/exchange", response_model=TokensResponse)
def exchange_code(payload: CodeExchangeRequest):
    return auth_service.exchange_authorization_code(payload)


@router.post("/refresh", response_model=TokensResponse)
def refresh(payload: RefreshTokenRequest):
    return auth_service.refresh_tokens(payload)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest):
    auth_service.forgot_password(payload)
    # Always return success-shaped message (auth_service swallows UserNotFound).
    return MessageResponse(message="If an account exists for this email, a reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ConfirmForgotPasswordRequest):
    auth_service.confirm_forgot_password(payload)
    return MessageResponse(message="Password reset successful. You can now log in.")


@router.post("/logout", response_model=MessageResponse)
def logout(access_token: str = Depends(get_current_access_token)):
    auth_service.global_sign_out(access_token)
    return MessageResponse(message="Logged out.")


@router.get("/me", response_model=UserProfile)
def me(claims: dict = Depends(get_current_user_claims)):
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")

    profile = user_service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Try logging in again.",
        )
    return profile


# ──────────────────────────────────────────────────────────────────
# Phase 3 — Postgres identity (find-or-create user + personal org)
# ──────────────────────────────────────────────────────────────────

@router.get("/identity", response_model=IdentityResponse)
async def identity(
    claims: dict = Depends(get_current_user_claims),
    access_token: str = Depends(get_current_access_token),
    session: AsyncSession = Depends(get_db),
) -> IdentityResponse:
    """Hydrate the caller's Postgres identity from their Cognito access token.

    First call for a user creates `users` + a personal `organizations` row +
    an Owner `organization_members` row, all in one transaction. Subsequent
    calls reuse those records (idempotent).
    """
    cognito_sub = claims.get("sub")
    if not cognito_sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims.",
        )

    email, full_name, given_name, source = _resolve_email_and_name(claims, access_token)
    log.info(
        "identity_resolve sub=%s email=%s source=%s",
        cognito_sub, email, source,
    )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not resolve a valid email for this account from the Cognito "
                "access token, Cognito GetUser, or the user profile store. "
                "Verify the user has an 'email' attribute set in Cognito."
            ),
        )

    svc = IdentityService(session)
    try:
        result = await svc.upsert_from_cognito(
            cognito_sub=cognito_sub,
            email=email,
            full_name=full_name,
            given_name=given_name,
        )
        await session.commit()
    except Exception as exc:  # surface DB unreachable / migration-not-applied clearly
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"identity_unavailable: {type(exc).__name__}: {exc}",
        )

    user, org, member = result.user, result.organization, result.membership
    return IdentityResponse(
        user=IdentityUser(
            id=str(user.id),
            cognito_sub=user.cognito_sub,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user.role.value,
            status=user.status.value,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
        organization=IdentityOrganization(
            id=str(org.id),
            name=org.name,
            slug=org.slug,
            plan=org.plan.value,
            owner_user_id=str(org.owner_user_id),
            created_at=org.created_at,
        ),
        membership=IdentityMembership(
            id=str(member.id),
            organization_id=str(member.organization_id),
            user_id=str(member.user_id),
            role=member.role.value,
            status=member.status.value,
            joined_at=member.joined_at,
        ),
        is_new_user=result.is_new_user,
    )
