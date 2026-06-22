"""boto3 Cognito Identity Provider client.

The client uses the AWS SDK default credential chain. Credentials are
provided via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars (or an
IAM role in production). No secrets in code.

Note: Client is lazy-loaded to allow backend to start even if AWS
credentials are temporarily unavailable.
"""
import logging
import boto3
from botocore.config import Config

from app.core.config import settings

log = logging.getLogger(__name__)

_boto_config = Config(
    region_name=settings.aws_region,
    retries={"max_attempts": 3, "mode": "standard"},
)

_cognito_client = None

def get_cognito_client():
    """Lazy-load Cognito client on first use.
    
    This allows the backend to start even if AWS credentials are
    temporarily unavailable, only failing when auth APIs are called.
    """
    global _cognito_client
    if _cognito_client is None:
        _cognito_client = boto3.client("cognito-idp", config=_boto_config)
        log.info("Cognito client initialized")
    return _cognito_client
