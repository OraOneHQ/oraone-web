"""Object-storage service (Phase 6).

Abstracts S3 vs local-disk storage so the rest of the codebase doesn't
need to care which one is active. In production we expect S3
(``S3_BUCKET`` env var set); in dev / preview where S3 isn't wired up
we fall back to a local directory under ``UPLOAD_DIR`` (default
``/tmp/oraone-uploads``) so the upload endpoint still works end-to-end.

The function ``put_object`` returns an ``s3_key``-style string the
caller persists into ``documents.s3_key``. For S3 it's just the key
(no bucket prefix); for local mode it's ``local://<relative-path>`` so
you can tell the modes apart at a glance in the DB.
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

log = logging.getLogger("app.storage")


def _bucket() -> str | None:
    return os.environ.get("S3_BUCKET") or None


def _region() -> str:
    return os.environ.get("S3_REGION") or os.environ.get("AWS_REGION", "us-east-1")


def _local_root() -> Path:
    root = Path(os.environ.get("UPLOAD_DIR", "/tmp/oraone-uploads"))
    root.mkdir(parents=True, exist_ok=True)
    return root


_s3_client = None


def _client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3", config=Config(region_name=_region(), retries={"max_attempts": 3})
        )
    return _s3_client


def build_key(*, organization_id: str, knowledge_base_id: str, filename: str) -> str:
    """Compose the storage key for a freshly uploaded document.

    Path layout: ``org/<org-id>/kb/<kb-id>/<uuid>__<safe-filename>``.
    The leading UUID guarantees uniqueness even if the same file is
    re-uploaded; ``__<filename>`` preserves the original name for the UI.
    """
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)[:180]
    return f"org/{organization_id}/kb/{knowledge_base_id}/{uuid.uuid4()}__{safe}"


def put_object(*, key: str, body: BinaryIO, content_type: str | None) -> str:
    """Upload to S3 if configured, else write to ``UPLOAD_DIR``.

    Returns the ``s3_key`` string to persist in ``documents.s3_key``.
    """
    bucket = _bucket()
    if bucket:
        try:
            _client().upload_fileobj(
                Fileobj=body,
                Bucket=bucket,
                Key=key,
                ExtraArgs={"ContentType": content_type} if content_type else None,
            )
            log.info("s3_upload ok bucket=%s key=%s", bucket, key)
            return key
        except (BotoCoreError, ClientError) as e:
            log.error("s3_upload_failed key=%s err=%s: %s", key, type(e).__name__, e)
            raise

    # Local fallback
    dest = _local_root() / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as f:
        while True:
            chunk = body.read(64 * 1024)
            if not chunk:
                break
            f.write(chunk)
    log.info("local_upload ok path=%s", dest)
    return f"local://{key}"


def is_local_key(s3_key: str) -> bool:
    return s3_key.startswith("local://")


def local_path(s3_key: str) -> Path:
    """For ``local://`` keys, return the absolute filesystem path."""
    rel = s3_key.removeprefix("local://")
    return _local_root() / rel
