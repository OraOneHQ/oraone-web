"""DynamoDB resource for the oraone-users table.

Note: Resources are lazy-loaded to allow backend to start even if AWS
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

_dynamodb_resource = None
_users_table = None

def get_users_table():
    """Lazy-load DynamoDB users table on first use.
    
    This allows the backend to start even if AWS credentials are
    temporarily unavailable, only failing when DynamoDB APIs are called.
    """
    global _dynamodb_resource, _users_table
    if _users_table is None:
        _dynamodb_resource = boto3.resource("dynamodb", config=_boto_config)
        _users_table = _dynamodb_resource.Table(settings.dynamodb_users_table)
        log.info("DynamoDB users table initialized")
    return _users_table

# Export for direct imports (will lazy-load on first call)
class _TableProxy:
    def __getattr__(self, name):
        return getattr(get_users_table(), name)
    
    def __call__(self, *args, **kwargs):
        return get_users_table()(*args, **kwargs)

users_table = _TableProxy()
dynamodb_resource = property(lambda self: get_users_table().meta.client).__get__(None, None)
