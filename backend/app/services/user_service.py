"""User profile service backed by DynamoDB."""
from datetime import datetime
from typing import Optional

from botocore.exceptions import ClientError

from app.database.dynamodb import users_table
from app.schemas.auth import UserProfile


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def get_user_profile(user_id: str) -> Optional[UserProfile]:
    try:
        response = users_table.get_item(Key={"userId": user_id})
    except ClientError:
        return None

    item = response.get("Item")
    if not item:
        return None

    return UserProfile(
        userId=item["userId"],
        email=item["email"],
        name=item.get("name", ""),
        role=item.get("role", "owner"),
        plan=item.get("plan", "beta"),
        status=item.get("status", "active"),
        createdAt=_parse_dt(item.get("createdAt")),
        lastLogin=_parse_dt(item.get("lastLogin")),
    )
