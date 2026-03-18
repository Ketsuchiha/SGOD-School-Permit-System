import json
import zipfile
import io
from pathlib import Path
from datetime import datetime


def create_backup(schools: list[dict], uploads_dir: Path) -> bytes:
    """
    Create a backup of all schools and their permit files.
    Returns a zip file containing JSON school data and all permit files.
    """
    backup_buffer = io.BytesIO()
    
    with zipfile.ZipFile(backup_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Write schools data
        schools_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "schools": schools,
        }
        zf.writestr("schools.json", json.dumps(schools_data, indent=2, ensure_ascii=True))
        
        # Add all permit files
        if uploads_dir.exists():
            for file_path in uploads_dir.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(uploads_dir.parent)
                    zf.write(file_path, arcname=str(arcname))
    
    backup_buffer.seek(0)
    return backup_buffer.getvalue()


def restore_backup(backup_bytes: bytes, uploads_dir: Path) -> dict:
    """
    Restore a backup from zip file.
    Returns information about restored schools and files.
    """
    restored_data = {
        "schools": [],
        "timestamp": None,
        "files_restored": 0,
        "files_skipped": 0,
    }
    
    backup_buffer = io.BytesIO(backup_bytes)
    
    with zipfile.ZipFile(backup_buffer, 'r') as zf:
        # Read schools data
        if "schools.json" in zf.namelist():
            schools_json = zf.read("schools.json").decode("utf-8")
            schools_data = json.loads(schools_json)
            restored_data["schools"] = schools_data.get("schools", [])
            restored_data["timestamp"] = schools_data.get("timestamp")
        
        # Restore files
        for file_info in zf.filelist:
            if file_info.filename == "schools.json":
                continue
            
            try:
                # Extract file to uploads directory
                target_path = uploads_dir.parent / file_info.filename
                
                # Skip if file already exists
                if target_path.exists():
                    restored_data["files_skipped"] += 1
                    continue
                
                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_bytes(zf.read(file_info.filename))
                restored_data["files_restored"] += 1
            except Exception as e:
                restored_data["files_skipped"] += 1
                continue
    
    return restored_data


def get_backup_info(backup_bytes: bytes) -> dict:
    """
    Get information about a backup file without fully restoring it.
    """
    info = {
        "timestamp": None,
        "school_count": 0,
        "file_count": 0,
    }
    
    try:
        backup_buffer = io.BytesIO(backup_bytes)
        
        with zipfile.ZipFile(backup_buffer, 'r') as zf:
            # Read schools data
            if "schools.json" in zf.namelist():
                schools_json = zf.read("schools.json").decode("utf-8")
                schools_data = json.loads(schools_json)
                info["timestamp"] = schools_data.get("timestamp")
                info["school_count"] = len(schools_data.get("schools", []))
            
            # Count files
            info["file_count"] = sum(1 for f in zf.namelist() if f != "schools.json")
    except Exception:
        pass
    
    return info
