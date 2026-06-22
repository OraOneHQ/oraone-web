"""DynamoDB resource for the oraone-users table."""
import boto3
from botocore.config import Config

from app.core.config import settings


_boto_config = Config(
    region_name=settings.aws_region,
    retries={"max_attempts": 3, "mode": "standard"},
)

dynamodb_resource = boto3.resource("dynamodb", config=_boto_config)
users_table = dynamodb_resource.Table(settings.dynamodb_users_table)
