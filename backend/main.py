"""
SkinAI Backend - FastAPI Application

Main entry point for the acne detection API.
Provides endpoints for image upload, processing, and AI analysis.
JWT-based authentication for all clinical endpoints.
"""

import asyncio
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.database import init_db
from services.logging_config import setup_logging
from services.predictor import predictor

setup_logging(os.getenv("SKINAI_ENV", "development"))
logger = logging.getLogger(__name__)

# ── Remote Capture Sessions ──
REMOTE_SESSIONS: dict[str, str] = {}  # session_id -> filename

# ── Rate limiting ──

_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30
_RATE_LIMIT_LAST_CLEANUP = time.time()
_RATE_LIMIT_CLEANUP_INTERVAL = 300  # 5 minutes
_RATE_LIMIT_MAX_KEYS = 100_000
_rate_limit_lock = asyncio.Lock()


def _cleanup_rate_limit():
    """Remove stale keys to prevent memory leaks."""
    global _RATE_LIMIT_LAST_CLEANUP
    now = time.time()
    if now - _RATE_LIMIT_LAST_CLEANUP < _RATE_LIMIT_CLEANUP_INTERVAL:
        return
    _RATE_LIMIT_LAST_CLEANUP = now
    cutoff = now - RATE_LIMIT_WINDOW
    stale_keys = [k for k, v in _rate_limit_store.items() if not v or v[-1] < cutoff]
    for k in stale_keys:
        del _rate_limit_store[k]


def _check_rate_limit(key: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS) -> bool:
    _cleanup_rate_limit()
    now = time.time()
    if key not in _rate_limit_store:
        if len(_rate_limit_store) >= _RATE_LIMIT_MAX_KEYS:
            _rate_limit_store.clear()
        _rate_limit_store[key] = []
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[key]) >= max_requests:
        return False
    _rate_limit_store[key].append(now)
    return True


# ── Filename validation ──

SAFE_FILENAME_RE = re.compile(r"^[a-zA-Z0-9_\-\.]+$")


def _safe_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal."""
    name = os.path.basename(filename)
    if not SAFE_FILENAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    return name


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")
    yield


app = FastAPI(
    title="SkinAI API",
    description="API for acne detection and skin analysis",
    version="3.0.0",
    lifespan=lifespan,
)


# ── Global exception handler ──

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


# ── Request size limit middleware ──

MAX_REQUEST_SIZE = 12 * 1024 * 1024  # 12MB (10MB file + overhead)

@app.middleware("http")
async def request_size_middleware(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            cl = int(content_length)
        except (ValueError, TypeError):
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})
        if cl > MAX_REQUEST_SIZE:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})
    return await call_next(request)


# ── Request ID middleware ──

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# ── CORS ──

CORS_ORIGINS = os.getenv("SKINAI_CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_image(file: UploadFile) -> bool:
    """Validate image file type and content."""
    if file.content_type and file.content_type.startswith("image/"):
        return True
    if file.filename:
        extension = file.filename.split(".")[-1].lower()
        return extension in ALLOWED_EXTENSIONS
    return False


def save_uploaded_file(file: UploadFile, contents: bytes, directory: str) -> str:
    """Save uploaded file to specified directory."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    extension = file.filename.split(".")[-1].lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(directory, unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    return unique_filename


def _clean_up_file(file_path: str):
    """Remove file if it exists, ignore errors."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "SkinAI API v3.0", "status": "healthy"}


@app.get("/health")
async def health():
    """Health check endpoint for Docker."""
    return {"status": "healthy"}


# ═══════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════

from routers import auth, media, products, scans, users

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(scans.router)
app.include_router(media.router)

from services.predictor import predictor
from services.daraz import search_products
from fastapi import HTTPException

@app.get("/model/status")
async def get_model_status():
    """Check AI model status."""
    return {
        "model_loaded": predictor.model_loaded,
        "model_type": predictor.acne_detector.model_type if predictor.acne_detector else "none",
        "input_size": "640x640",
        "confidence_threshold": 0.25,
    }

@app.get("/products/search")
async def search_daraz_products(q: str, limit: int = 3):
    """Search Daraz Nepal for skincare products."""
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    if limit < 1 or limit > 10:
        limit = 3
    products = await search_products(q.strip(), limit=limit)
    return {"query": q.strip(), "count": len(products), "products": products}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

