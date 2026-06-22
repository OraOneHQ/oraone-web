"""boto3 Cognito Identity Provider client.

The client uses the AWS SDK default credential chain. Credentials are
provided via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars (or an
IAM role in production). No secrets in code.
"""
import boto3
from botocore.config import Config

from app.core.config import settings


_boto_config = Config(
    region_name=settings.aws_region,
    retries={"max_attempts": 3, "mode": "standard"},
)

cognito_client = boto3.client("cognito-idp", config=_boto_config)
