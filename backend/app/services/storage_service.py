import os
import re
import uuid
from pathlib import Path
from urllib import parse


ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and invalid characters."""
    # Remove path components and invalid characters
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    filename = re.sub(r'[<>:"|?*\x00-\x1f]', '', filename)
    # Remove leading/trailing spaces and dots
    filename = filename.strip('. ')
    return filename if filename else "permit"


def _safe_extension(filename: str) -> str:
    """Extract and validate file extension."""
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix in ALLOWED_EXTENSIONS else ".pdf"


def _build_object_name(filename: str, school_year: str = "") -> str:
    """Generate a unique object name for file storage.
    Organizes files by school year and preserves original filename for easy identification.
    """
    extension = _safe_extension(filename)
    year_folder = school_year.strip() if school_year else "unsorted"
    # Sanitize year folder to prevent directory traversal
    year_folder = year_folder.replace("..", "").replace("/", "").replace("\\", "")
    
    # Preserve original filename (sanitized)
    base_name = _sanitize_filename(Path(filename).stem)
    
    # If filename is already unique enough, use it directly; otherwise add a short UUID suffix
    object_name = f"permits/{year_folder}/{base_name}{extension}"
    return object_name


def store_permit_file(file_bytes: bytes, filename: str, content_type: str, uploads_dir: Path, backend_base_url: str, school_year: str = "") -> dict:
    """
    Store permit file to local storage only, organized by school year.
    Preserves original filename for easy identification.
    Files are organized as: uploads/permits/{schoolYear}/{filename}
    If collision detected, appends a short suffix.
    """
    object_name = _build_object_name(filename, school_year)
    local_path = uploads_dir / object_name
    local_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Handle filename collisions by appending a suffix
    counter = 1
    while local_path.exists():
        extension = _safe_extension(filename)
        base_name = _sanitize_filename(Path(filename).stem)
        year_folder = school_year.strip() if school_year else "unsorted"
        year_folder = year_folder.replace("..", "").replace("/", "").replace("\\", "")
        object_name = f"permits/{year_folder}/{base_name}_{counter}{extension}"
        local_path = uploads_dir / object_name
        counter += 1
    
    local_path.write_bytes(file_bytes)

    relative_url = f"/api/files/{parse.quote(object_name, safe='/')}"
    absolute_url = f"{backend_base_url.rstrip('/')}{relative_url}"
    
    return {
        "url": absolute_url,
        "storage": "local",
        "path": object_name,
        "contentType": content_type,
    }


def delete_permit_file(file_path: str, uploads_dir: Path) -> bool:
    """
    Delete a permit file by its relative path.
    Returns True if successful, False if file doesn't exist or error occurs.
    """
    try:
        full_path = uploads_dir / file_path
        # Safety check: ensure the path is within uploads_dir
        if not str(full_path.resolve()).startswith(str(uploads_dir.resolve())):
            return False
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    except Exception:
        return False
