import logging
import os
import re
import time
import uuid

from fastapi import UploadFile

MAX_FILE_SIZE = 12 * 1024 * 1024
RATE_LIMIT_MAX_REQUESTS = 30
RATE_LIMIT_WINDOW = 60
RATE_LIMITS: dict = {}
logger = logging.getLogger("skinai")

def _cleanup_rate_limit():
    current = time.time()
    expired = [k for k, v in RATE_LIMITS.items() if current - v['reset_time'] > 0]
    for k in expired:
        del RATE_LIMITS[k]

def _check_rate_limit(key: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS) -> bool:
    _cleanup_rate_limit()
    current = time.time()
    if key not in RATE_LIMITS:
        RATE_LIMITS[key] = {"count": 1, "reset_time": current + RATE_LIMIT_WINDOW}
        return True

    if current > RATE_LIMITS[key]["reset_time"]:
        RATE_LIMITS[key] = {"count": 1, "reset_time": current + RATE_LIMIT_WINDOW}
        return True

    RATE_LIMITS[key]["count"] += 1
    return RATE_LIMITS[key]["count"] <= max_requests

def _safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return filename

def validate_image(file: UploadFile) -> bool:
    if not file.filename:
        return False
    ext = file.filename.split('.')[-1].lower()
    if file.content_type and file.content_type.startswith('image/'):
        return True
    if ext in {'jpg', 'jpeg', 'png'}:
        return True
    return False

def save_uploaded_file(file: UploadFile, contents: bytes, directory: str) -> str:
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
    ext = file.filename.split('.')[-1].lower() if file.filename else 'jpg'
    safe_name = f"upload_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(directory, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    return safe_name


