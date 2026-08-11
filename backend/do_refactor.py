import os
import re

with open('main.py', 'r') as f:
    lines = f.readlines()

def find_line(pattern):
    for i, line in enumerate(lines):
        if pattern in line:
            return i
    return -1

headers = {
    'auth': find_line('# AUTH ROUTES'),
    'protected_clinical': find_line('# PROTECTED CLINICAL ROUTES'),
    'saved_products': find_line('# SAVED PRODUCTS'),
    'remote_capture': find_line('# REMOTE CAPTURE ROUTES'),
    'scan_history': find_line('# SCAN HISTORY ROUTES'),
    'pigmentation_progress': find_line('# PIGMENTATION PROGRESS & COMPARISON'),
    'image_serving': find_line('# IMAGE SERVING ROUTES'),
    'model_status': find_line('@app.get("/model/status")'),
    'daraz': find_line('# DARAZ PRODUCT SEARCH')
}

common_imports = """import os
import uuid
import time
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    UserCreate, UserLogin, UserUpdate, ChangePassword,
    create_user_account, login_user, get_current_user,
    update_user_profile, change_user_password, delete_user_account
)
from services.database import get_db
from services.models import Scan, SavedProduct, User
from services.image_processor import image_processor
from services.predictor import predictor
from services.daraz import search_products, search_products_for_recommendations
from utils import _safe_filename, validate_image, save_uploaded_file, _clean_up_file, MAX_FILE_SIZE

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")

"""

os.makedirs('routers', exist_ok=True)
with open('routers/__init__.py', 'w') as f: pass

# utils.py
with open('utils.py', 'w') as f:
    f.write("""import os
import re
import time
import uuid
import logging
from fastapi import UploadFile

MAX_FILE_SIZE = 12 * 1024 * 1024
logger = logging.getLogger("skinai")

def _safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return filename

def validate_image(file: UploadFile) -> bool:
    if not file.filename:
        return False
    ext = file.filename.split('.')[-1].lower()
    if ext not in {'jpg', 'jpeg', 'png'}:
        return False
    if not file.content_type or not file.content_type.startswith('image/'):
        return False
    return True

def save_uploaded_file(file: UploadFile, contents: bytes, directory: str) -> str:
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
    ext = file.filename.split('.')[-1].lower() if file.filename else 'jpg'
    safe_name = f"upload_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(directory, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    return safe_name

def _clean_up_file(file_path: str):
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Failed to clean up file {file_path}: {e}")
""")

def make_router(filename, sections, prefix, tags):
    code = common_imports + f"\nrouter = APIRouter(prefix='{prefix}', tags={tags})\n\n"
    if filename == 'scans.py':
        code += "REMOTE_SESSIONS: Dict[str, str] = {}\n\n"

    for start, end in sections:
        c = "".join(lines[start:end]).replace("@app.", "@router.")
        code += c

    with open(f"routers/{filename}", "w") as f:
        f.write(code)

make_router('auth.py', [(headers['auth'], find_line('@app.get("/auth/me")'))], "/auth", "['auth']")
make_router('users.py', [(find_line('@app.get("/auth/me")'), headers['protected_clinical'])], "/auth", "['users']")
make_router('scans.py', [
    (headers['protected_clinical'], headers['saved_products']),
    (headers['remote_capture'], headers['scan_history']),
    (headers['scan_history'], headers['pigmentation_progress']),
    (headers['pigmentation_progress'], headers['image_serving'])
], "", "['scans']")
make_router('products.py', [
    (headers['saved_products'], headers['remote_capture']),
    (headers['daraz'], len(lines))
], "/products", "['products']")
make_router('media.py', [(headers['image_serving'], headers['model_status'])], "", "['media']")

# main.py
new_main = "".join(lines[:headers['auth']])
# Replace the helper functions in main.py with import from utils
# The helpers were from line 98 to 219 (def root is 220)
# We will just strip them from main.py and import them if needed
import_utils = "from utils import _safe_filename, validate_image, save_uploaded_file, _clean_up_file, MAX_FILE_SIZE\n"
new_main = re.sub(r'def _safe_filename[\s\S]*?(?=@app\.get)', import_utils + '\n\n', new_main)

new_main += "from routers import auth, users, products, scans, media\n"
new_main += "app.include_router(auth.router)\n"
new_main += "app.include_router(users.router)\n"
new_main += "app.include_router(products.router)\n"
new_main += "app.include_router(scans.router)\n"
new_main += "app.include_router(media.router)\n\n"
new_main += "".join(lines[headers['model_status']:headers['daraz']])

with open('main.py', 'w') as f:
    f.write(new_main)

