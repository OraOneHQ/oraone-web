"""Cognito authentication service.

Wraps boto3 cognito-idp calls and maps Cognito exceptions to FastAPI
HTTPExceptions with user-friendly messages. Also upserts the user
profile in DynamoDB on every successful login (and refreshes lastLogin).
"""
from datetime import datetime, timezone
from typing import Dict

import requests
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from jose import jwt as jose_jwt

from app.core.cognito import cognito_client
from app.core.config import settings
from app.database.dynamodb import users_table
from app.schemas.auth import (
    CodeExchangeRequest,
    ConfirmForgotPasswordRequest,
    ConfirmSignUpRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    ResendConfirmationRequest,
    SignUpRequest,
    TokensResponse,
)


# ─────────────────────────────────────────────────────────────
# Error mapping
# ─────────────────────────────────────────────────────────────

_COGNITO_ERROR_MAP: Dict[str, tuple] = {
    "UsernameExistsException": (status.HTTP_400_BAD_REQUEST, "An account with this email already exists."),
    "UserNotFoundException": (status.HTTP_404_NOT_FOUND, "No account found with this email."),
    "UserNotConfirmedException": (status.HTTP_403_FORBIDDEN, "Email not verified. Please verify your email first."),
    "NotAuthorizedException": (status.HTTP_401_UNAUTHORIZED, "Invalid email or password."),
    "CodeMismatchException": (status.HTTP_400_BAD_REQUEST, "Incorrect verification code."),
    "ExpiredCodeException": (status.HTTP_400_BAD_REQUEST, "Verification code has expired. Please request a new one."),
    "InvalidPasswordException": (status.HTTP_400_BAD_REQUEST, "Password does not meet the security requirements."),
    "InvalidParameterException": (status.HTTP_400_BAD_REQUEST, "Invalid request parameters."),
    "LimitExceededException": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Please try again later."),
    "TooManyRequestsException": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please slow down."),
    "TooManyFailedAttemptsException": (status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Please try again later."),
    "CodeDeliveryFailureException": (status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to deliver verification code."),
    "AliasExistsException": (status.HTTP_400_BAD_REQUEST, "An account with this email already exists."),
    "PasswordResetRequiredException": (status.HTTP_403_FORBIDDEN, "Password reset required. Please reset your password."),
}


def _raise_cognito_error(e: ClientError) -> None:
    code = e.response.get("Error", {}).get("Code", "UnknownException")
    raw_message = e.response.get("Error", {}).get("Message", "Authentication service error.")
    http_status, friendly_message = _COGNITO_ERROR_MAP.get(
        code, (status.HTTP_500_INTERNAL_SERVER_ERROR, raw_message)
    )

    # NotAuthorizedException can mean "user is disabled" — surface that distinctly.
    if code == "NotAuthorizedException" and "disabled" in raw_message.lower():
        http_status = status.HTTP_403_FORBIDDEN
        friendly_message = "This account has been disabled. Contact support."

    raise HTTPException(status_code=http_status, detail=friendly_message)


# ─────────────────────────────────────────────────────────────
# Cognito operations
# ─────────────────────────────────────────────────────────────

def sign_up(data: SignUpRequest) -> dict:
    try:
        response = cognito_client.sign_up(
            ClientId=settings.cognito_app_client_id,
            Username=data.email,
            Password=data.password,
            UserAttributes=[
                {"Name": "email", "Value": data.email},
                {"Name": "name", "Value": data.name},
            ],
        )
        return {
            "user_sub": response.get("UserSub"),
            "user_confirmed": response.get("UserConfirmed", False),
            "delivery": response.get("CodeDeliveryDetails", {}),
        }
    except ClientError as e:
        _raise_cognito_error(e)


def confirm_sign_up(data: ConfirmSignUpRequest) -> None:
    try:
        cognito_client.confirm_sign_up(
            ClientId=settings.cognito_app_client_id,
            Username=data.email,
            ConfirmationCode=data.code,
        )
        _ensure_profile_from_cognito_username(data.email)
    except ClientError as e:
        _raise_cognito_error(e)


def resend_confirmation_code(data: ResendConfirmationRequest) -> dict:
    try:
        response = cognito_client.resend_confirmation_code(
            ClientId=settings.cognito_app_client_id,
            Username=data.email,
        )
        return {"delivery": response.get("CodeDeliveryDetails", {})}
    except ClientError as e:
        _raise_cognito_error(e)


def login(data: LoginRequest) -> TokensResponse:
    try:
        response = cognito_client.initiate_auth(
            ClientId=settings.cognito_app_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": data.email,
                "PASSWORD": data.password,
            },
        )
    except ClientError as e:
        _raise_cognito_error(e)

    auth_result = response.get("AuthenticationResult") or {}
    if not auth_result.get("AccessToken"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Additional authentication challenge required.",
        )

    id_token = auth_result.get("IdToken", "")
    access_token = auth_result["AccessToken"]
    refresh_token = auth_result.get("RefreshToken")
    expires_in = auth_result.get("ExpiresIn", 3600)
    token_type = auth_result.get("TokenType", "Bearer")

    # Decode ID token (unverified — Cognito just minted it) to get user attributes.
    claims = jose_jwt.get_unverified_claims(id_token) if id_token else {}
    user_id = claims.get("sub")
    email_claim = claims.get("email") or data.email
    name_claim = claims.get("name") or claims.get("cognito:username") or ""

    if user_id:
        _upsert_user_profile(user_id=user_id, email=email_claim, name=name_claim)

    return TokensResponse(
        access_token=access_token,
        id_token=id_token,
        refresh_token=refresh_token,
        token_type=token_type,
        expires_in=expires_in,
    )


def exchange_authorization_code(data: CodeExchangeRequest) -> TokensResponse:
    redirect_uri = data.redirect_uri or settings.cognito_redirect_uri
    token_url = f"{settings.cognito_domain.rstrip('/')}/oauth2/token"

    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.cognito_app_client_id,
        "code": data.code,
        "redirect_uri": redirect_uri,
    }

    try:
        response = requests.post(
            token_url,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Cognito token endpoint.",
        ) from exc

    if response.status_code >= 400:
        err = {}
        try:
            err = response.json()
        except ValueError:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err.get("error_description") or err.get("error") or "Code exchange failed.",
        )

    data_json = response.json()
    access_token = data_json.get("access_token")
    id_token = data_json.get("id_token", "")
    refresh_token = data_json.get("refresh_token")
    expires_in = int(data_json.get("expires_in", 3600))
    token_type = data_json.get("token_type", "Bearer")

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code exchange did not return an access token.",
        )

    claims = jose_jwt.get_unverified_claims(id_token) if id_token else {}
    user_id = claims.get("sub")
    email_claim = claims.get("email") or ""
    name_claim = claims.get("name") or claims.get("cognito:username") or ""

    if user_id:
        _upsert_user_profile(user_id=user_id, email=email_claim, name=name_claim)

    return TokensResponse(
        access_token=access_token,
        id_token=id_token,
        refresh_token=refresh_token,
        token_type=token_type,
        expires_in=expires_in,
    )


def forgot_password(data: ForgotPasswordRequest) -> dict:
    try:
        response = cognito_client.forgot_password(
            ClientId=settings.cognito_app_client_id,
            Username=data.email,
        )
        return {"delivery": response.get("CodeDeliveryDetails", {})}
    except ClientError as e:
        # Don't leak whether the email exists — but still surface rate-limit / generic errors.
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("UserNotFoundException",):
            # Behave like success to avoid email enumeration.
            return {"delivery": {}}
        _raise_cognito_error(e)


def confirm_forgot_password(data: ConfirmForgotPasswordRequest) -> None:
    try:
        cognito_client.confirm_forgot_password(
            ClientId=settings.cognito_app_client_id,
            Username=data.email,
            ConfirmationCode=data.code,
            Password=data.new_password,
        )
    except ClientError as e:
        _raise_cognito_error(e)


def global_sign_out(access_token: str) -> None:
    try:
        cognito_client.global_sign_out(AccessToken=access_token)
    except ClientError:
        # Best-effort; we still want logout to succeed client-side.
        return


def refresh_tokens(data: RefreshTokenRequest) -> TokensResponse:
    try:
        response = cognito_client.initiate_auth(
            ClientId=settings.cognito_app_client_id,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={
                "REFRESH_TOKEN": data.refresh_token,
            },
        )
    except ClientError as e:
        _raise_cognito_error(e)

    auth_result = response.get("AuthenticationResult") or {}
    access_token = auth_result.get("AccessToken")
    id_token = auth_result.get("IdToken", "")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
        )

    claims = jose_jwt.get_unverified_claims(id_token) if id_token else {}
    user_id = claims.get("sub")
    email_claim = claims.get("email")
    name_claim = claims.get("name") or claims.get("cognito:username") or ""
    if user_id:
        _upsert_user_profile(user_id=user_id, email=email_claim or "", name=name_claim)

    return TokensResponse(
        access_token=access_token,
        id_token=id_token,
        refresh_token=data.refresh_token,
        token_type=auth_result.get("TokenType", "Bearer"),
        expires_in=auth_result.get("ExpiresIn", 3600),
    )


# ─────────────────────────────────────────────────────────────
# DynamoDB profile upsert
# ─────────────────────────────────────────────────────────────

def _upsert_user_profile(user_id: str, email: str, name: str) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    split_name = (name or "").strip().split(" ", 1)
    first_name = split_name[0] if split_name and split_name[0] else ""
    last_name = split_name[1] if len(split_name) > 1 else ""
    try:
        users_table.update_item(
            Key={"userId": user_id},
            UpdateExpression=(
                "SET email = :e, "
                "emailVerified = if_not_exists(emailVerified, :ev), "
                "#nm = if_not_exists(#nm, :n), "
                "firstName = if_not_exists(firstName, :fn), "
                "lastName = if_not_exists(lastName, :ln), "
                "#rl = if_not_exists(#rl, :r), "
                "#pl = if_not_exists(#pl, :p), "
                "#st = if_not_exists(#st, :s), "
                "createdAt = if_not_exists(createdAt, :c), "
                "updatedAt = :u, "
                "lastLogin = :l"
            ),
            ExpressionAttributeNames={
                "#nm": "name",
                "#rl": "role",
                "#pl": "plan",
                "#st": "status",
            },
            ExpressionAttributeValues={
                ":e": email,
                ":ev": True,
                ":n": name or "",
                ":fn": first_name,
                ":ln": last_name,
                ":r": "user",
                ":p": "free",
                ":s": "active",
                ":c": now_iso,
                ":u": now_iso,
                ":l": now_iso,
            },
            ReturnValues="NONE",
        )
    except ClientError:
        # Profile upsert is best-effort — never block login on DDB hiccups.
        pass


def _ensure_profile_from_cognito_username(username: str) -> None:
    """Create user profile in DynamoDB immediately after email verification."""
    try:
        response = cognito_client.admin_get_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=username,
        )
    except ClientError:
        return

    attrs = {a.get("Name"): a.get("Value") for a in response.get("UserAttributes", [])}
    user_id = attrs.get("sub")
    email = attrs.get("email") or username
    name = attrs.get("name") or ""
    if not user_id:
        return

    _upsert_user_profile(user_id=user_id, email=email, name=name)
