import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from utils import _safe_filename

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")


router = APIRouter(prefix='', tags=['media'])

# IMAGE SERVING ROUTES (with path traversal protection)
# ═══════════════════════════════════════════

@router.get("/images/original/{filename}")
async def get_original_image(filename: str):
    """Serve original uploaded images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/jpeg")


@router.get("/images/processed/{filename}")
async def get_processed_image(filename: str):
    """Serve processed images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(PROCESSED_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Processed image not found")
    return FileResponse(file_path, media_type="image/png")


@router.get("/results/{filename}")
async def get_result_image(filename: str):
    """Serve detection result images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(RESULTS_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result image not found")
    return FileResponse(file_path, media_type="image/jpeg")


