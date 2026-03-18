import os
import uuid
from pathlib import Path
from urllib import parse


ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _safe_extension(filename: str) -> str:
    """Extract and validate file extension."""
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix in ALLOWED_EXTENSIONS else ".pdf"


def _build_object_name(filename: str) -> str:
    """Generate a unique object name for file storage."""
    extension = _safe_extension(filename)
    return f"permits/{uuid.uuid4().hex}{extension}"


def store_permit_file(file_bytes: bytes, filename: str, content_type: str, uploads_dir: Path, backend_base_url: str) -> dict:
    """
    Store permit file to local storage only.
    Uses backend/data/uploads/ directory.
    """
    object_name = _build_object_name(filename)
    local_path = uploads_dir / object_name
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(file_bytes)

    relative_url = f"/api/files/{parse.quote(object_name, safe='/')}"
    absolute_url = f"{backend_base_url.rstrip('/')}{relative_url}"
    
    return {
        "url": absolute_url,
        "storage": "local",
        "path": object_name,
        "contentType": content_type,
    }
