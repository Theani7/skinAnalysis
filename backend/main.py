"""
SkinAI Backend - FastAPI Application

Main entry point for the acne detection API.
Provides endpoints for image upload, processing, and AI analysis.
JWT-based authentication for all clinical endpoints.
"""

import asyncio
import json
import logging
import os
import re
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    UserCreate,
    UserLogin,
    UserUpdate,
    get_current_user,
    login_user,
    register_user,
    update_user_profile,
)
from services.daraz import search_products, search_products_for_recommendations
from services.database import get_db, init_db
from services.image_processor import image_processor
from services.logging_config import setup_logging
from services.models import Scan
from services.predictor import predictor

setup_logging(os.getenv("SKINAI_ENV", "development"))
logger = logging.getLogger(__name__)

# ── Rate limiting ──

_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30


def _check_rate_limit(key: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS) -> bool:
    now = datetime.now().timestamp()
    if key not in _rate_limit_store:
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
    logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


# ── Request ID middleware ──

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# ── CORS ──

CORS_ORIGINS = os.getenv("SKINAI_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
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

@app.post("/auth/register")
async def register(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(f"register:{client_ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please try again later.")
    try:
        return await register_user(data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@app.post("/auth/login")
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(f"login:{client_ip}", max_requests=10):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    try:
        return await login_user(data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")


@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return user


@app.put("/auth/profile")
async def update_profile(
    data: UserUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (name)."""
    try:
        return await update_user_profile(user["id"], data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to update profile.")


# ═══════════════════════════════════════════
# PROTECTED CLINICAL ROUTES
# ═══════════════════════════════════════════

@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload an image file. (Requires authentication)"""
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed",
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

        filename = save_uploaded_file(file, contents, UPLOAD_DIR)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Image uploaded successfully",
                "filename": filename,
                "path": f"/images/original/{filename}",
                "size": len(contents),
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Upload error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error during upload")


@app.post("/process")
async def process_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Process image with OpenCV preprocessing pipeline. (Requires authentication)"""
    file_path = None
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed",
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

        filename = save_uploaded_file(file, contents, UPLOAD_DIR)
        file_path = os.path.join(UPLOAD_DIR, filename)

        result = image_processor.process_image(file_path)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "original_image": result["original_filename"],
                "processed_image": result["processed_filename"],
                "original_path": f"/images/original/{result['original_filename']}",
                "processed_path": f"/images/processed/{result['processed_filename']}",
                "dimensions": result["dimensions"],
                "normalized": result["normalized"],
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Processing error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Image processing failed.")
    finally:
        pass  # Keep uploaded file for serving


@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze image for acne detection using YOLOv8 model. (Requires authentication)"""
    file_path = None
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed",
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

        if not predictor.model_loaded:
            raise HTTPException(
                status_code=503,
                detail="AI model not available. Please check model file.",
            )

        filename = save_uploaded_file(file, contents, UPLOAD_DIR)
        file_path = os.path.join(UPLOAD_DIR, filename)

        logger.info(f"Analyzing image: {filename} (user: {user['email']})")

        # Run synchronous inference in a thread to avoid blocking the event loop
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(predictor.analyze_image, file_path),
                timeout=90,
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail="Analysis timed out. The image may be too complex. Please try a simpler image.",
            )

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail="Analysis failed. Please try again.",
            )

        # Save scan to database
        scan = Scan(
            user_id=user["id"],
            original_image=filename,
            result_image=result["result_image"],
            acne_count=result["acne_count"],
            severity=result["severity"],
            confidence=result["confidence"],
            spot_types=json.dumps(result.get("spot_types", {})),
            pigmentation_data=json.dumps(result.get("pigmentation_data")),
            dryness_data=json.dumps(result.get("dryness_data")),
            recommendations=json.dumps(result.get("recommendations", [])),
            conflicts=json.dumps(result.get("conflicts", [])),
            routine=json.dumps(result.get("routine", {"morning": [], "evening": [], "tips": []})),
            face_quality=json.dumps(result.get("face_quality")),
        )
        db.add(scan)
        await db.flush()
        logger.info(f"Scan saved: {scan.id} (user: {user['email']})")

        # Enrich recommendations with Daraz products
        recommendations = result.get("recommendations", [])
        skincare_ids = [r["id"] for r in recommendations if r.get("category") == "skincare"]
        if skincare_ids:
            try:
                product_map = await search_products_for_recommendations(
                    skincare_ids, limit_per_query=2
                )
                for rec in recommendations:
                    if rec["id"] in product_map:
                        rec["products"] = product_map[rec["id"]]
            except Exception as e:
                logger.warning(f"Daraz product fetch failed (non-fatal): {e}")

        # Build recommendation lookup: rec_id -> cheapest product price
        rec_price_map: dict = {}
        for rec in recommendations:
            products = rec.get("products", [])
            if products:
                rec_price_map[rec["id"]] = min(p["price"] for p in products if p.get("price", 0) > 0)

        # Calculate routine costs
        routine = result.get("routine", {"morning": [], "evening": [], "tips": []})
        morning_cost = sum(rec_price_map.get(step["id"], 0) for step in routine.get("morning", []))
        evening_cost = sum(rec_price_map.get(step["id"], 0) for step in routine.get("evening", []))
        routine["cost_summary"] = {
            "morning_cost": morning_cost,
            "evening_cost": evening_cost,
            "total_cost": morning_cost + evening_cost,
            "currency": "Rs.",
            "products_found": len(rec_price_map),
        }

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "original_image": filename,
                "acne_count": result["acne_count"],
                "severity": result["severity"],
                "confidence": result["confidence"],
                "result_image": result["result_image"],
                "original_path": f"/images/original/{filename}",
                "result_path": f"/results/{result['result_image']}",
                "spot_types": result.get("spot_types", {}),
                "pigmentation_data": result.get("pigmentation_data"),
                "dryness_data": result.get("dryness_data"),
                "recommendations": recommendations,
                "conflicts": result.get("conflicts", []),
                "routine": routine,
                "face_quality": result.get("face_quality"),
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Analysis error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")
    finally:
        pass  # Keep uploaded file for serving


# ═══════════════════════════════════════════
# SCAN HISTORY ROUTES
# ═══════════════════════════════════════════

@app.get("/scans")
async def list_scans(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    """List the current user's scan history, newest first."""
    try:
        limit = min(limit, 100)  # Cap at 100
        result = await db.execute(
            select(Scan)
            .where(Scan.user_id == user["id"])
            .order_by(Scan.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        scans = result.scalars().all()

        count_result = await db.execute(
            select(func.count()).select_from(Scan).where(Scan.user_id == user["id"])
        )
        total = count_result.scalar()

        return {
            "scans": [
                {
                    "id": s.id,
                    "created_at": s.created_at.isoformat(),
                    "original_image": s.original_image,
                    "result_image": s.result_image,
                    "acne_count": s.acne_count,
                    "severity": s.severity,
                    "confidence": s.confidence,
                    "original_path": f"/images/original/{s.original_image}",
                    "result_path": f"/results/{s.result_image}",
                }
                for s in scans
            ],
            "total": total,
        }
    except Exception as e:
        logger.error(f"Error listing scans: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to load scan history.")


@app.get("/scans/history/progress")
async def get_progress_data(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get progress data for charts: scores over time for this user."""
    try:
        result = await db.execute(
            select(Scan)
            .where(Scan.user_id == user["id"])
            .order_by(Scan.created_at.asc())
        )
        scans = result.scalars().all()

        if not scans:
            return {"progress": [], "recent_scans": [], "latest_stats": None}

        severity_scores = {"Clear": 100, "Mild": 75, "Moderate": 50, "Severe": 25}
        progress = []
        for s in scans:
            progress.append({
                "date": s.created_at.strftime("%b %d"),
                "score": severity_scores.get(s.severity, 50),
                "acne_count": s.acne_count,
                "severity": s.severity,
                "id": s.id,
            })

        latest = scans[-1]
        latest_stats = {
            "acne_count": latest.acne_count,
            "severity": latest.severity,
            "confidence": latest.confidence,
        }

        recent = list(reversed(scans[-5:]))
        recent_scans = [
            {
                "id": s.id,
                "date": s.created_at.strftime("%B %d, %Y"),
                "time": s.created_at.strftime("%I:%M %p"),
                "score": severity_scores.get(s.severity, 50),
                "severity": s.severity,
                "acne": s.acne_count,
            }
            for s in recent
        ]

        return {
            "progress": progress,
            "recent_scans": recent_scans,
            "latest_stats": latest_stats,
        }
    except Exception as e:
        logger.error(f"Error fetching progress data: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to load progress data.")


@app.get("/scans/{scan_id}")
async def get_scan(
    scan_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single scan's full details."""
    try:
        result = await db.execute(
            select(Scan).where(Scan.id == scan_id, Scan.user_id == user["id"])
        )
        scan = result.scalar_one_or_none()

        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found.")

        def _safe_json(text: str, default):
            try:
                return json.loads(text)
            except (json.JSONDecodeError, TypeError):
                return default

        return {
            "id": scan.id,
            "created_at": scan.created_at.isoformat(),
            "original_image": scan.original_image,
            "result_image": scan.result_image,
            "acne_count": scan.acne_count,
            "severity": scan.severity,
            "confidence": scan.confidence,
            "spot_types": _safe_json(scan.spot_types, {}),
            "pigmentation_data": _safe_json(scan.pigmentation_data, None),
            "dryness_data": _safe_json(scan.dryness_data, None),
            "recommendations": _safe_json(scan.recommendations, []),
            "conflicts": _safe_json(scan.conflicts, []),
            "routine": _safe_json(scan.routine, {"morning": [], "evening": [], "tips": []}),
            "face_quality": _safe_json(scan.face_quality, None),
            "original_path": f"/images/original/{scan.original_image}",
            "result_path": f"/results/{scan.result_image}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scan {scan_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to load scan details.")


# ═══════════════════════════════════════════
# PIGMENTATION PROGRESS & COMPARISON
# ═══════════════════════════════════════════


@app.get("/scans/history/pigmentation-progress")
async def get_pigmentation_progress(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pigmentation clarity and coverage over time for progress charts."""
    try:
        result = await db.execute(
            select(Scan)
            .where(Scan.user_id == user["id"])
            .order_by(Scan.created_at.asc())
        )
        scans = result.scalars().all()

        if not scans:
            return {"progress": [], "latest": None}

        def _safe_json(text: str, default):
            try:
                return json.loads(text)
            except (json.JSONDecodeError, TypeError):
                return default

        progress = []
        for s in scans:
            pig = _safe_json(s.pigmentation_data, None) or {}
            progress.append({
                "id": s.id,
                "date": s.created_at.strftime("%b %d"),
                "clarity_score": pig.get("clarity_score", 100),
                "spots_count": pig.get("spots_count", 0),
                "intensity": pig.get("intensity", "Low"),
                "normalized_coverage": pig.get("normalized_coverage", 0),
                "spatial_pattern": pig.get("spatial_pattern", "none"),
                "type_distribution": pig.get("type_distribution", {}),
            })

        latest = scans[-1]
        latest_pig = _safe_json(latest.pigmentation_data, None) or {}
        latest_data = {
            "id": latest.id,
            "date": latest.created_at.strftime("%B %d, %Y"),
            "clarity_score": latest_pig.get("clarity_score", 100),
            "spots_count": latest_pig.get("spots_count", 0),
            "intensity": latest_pig.get("intensity", "Low"),
            "normalized_coverage": latest_pig.get("normalized_coverage", 0),
            "spatial_pattern": latest_pig.get("spatial_pattern", "none"),
            "type_distribution": latest_pig.get("type_distribution", {}),
        }

        return {"progress": progress, "latest": latest_data}
    except Exception as e:
        logger.error(f"Error fetching pigmentation progress: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to load pigmentation progress.")


@app.get("/scans/{scan_id}/compare")
async def compare_scans(
    scan_id: str,
    compare_to: str = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare pigmentation between two scans. If compare_to is omitted, uses the previous scan."""
    def _safe_json(text: str, default):
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return default

    try:
        result = await db.execute(
            select(Scan).where(Scan.id == scan_id, Scan.user_id == user["id"])
        )
        current_scan = result.scalar_one_or_none()
        if not current_scan:
            raise HTTPException(status_code=404, detail="Scan not found.")

        current_pig = _safe_json(current_scan.pigmentation_data, None) or {}

        if compare_to:
            prev_result = await db.execute(
                select(Scan).where(Scan.id == compare_to, Scan.user_id == user["id"])
            )
            prev_scan = prev_result.scalar_one_or_none()
        else:
            prev_result = await db.execute(
                select(Scan)
                .where(Scan.user_id == user["id"], Scan.created_at < current_scan.created_at)
                .order_by(Scan.created_at.desc())
                .limit(1)
            )
            prev_scan = prev_result.scalar_one_or_none()

        if not prev_scan:
            return {
                "current": {
                    "id": current_scan.id,
                    "date": current_scan.created_at.strftime("%B %d, %Y"),
                    "pigmentation": current_pig,
                },
                "previous": None,
                "deltas": None,
                "message": "No previous scan found for comparison.",
            }

        prev_pig = _safe_json(prev_scan.pigmentation_data, None) or {}

        c_clarity = current_pig.get("clarity_score", 100)
        p_clarity = prev_pig.get("clarity_score", 100)
        c_coverage = current_pig.get("normalized_coverage", 0)
        p_coverage = prev_pig.get("normalized_coverage", 0)
        c_spots = current_pig.get("spots_count", 0)
        p_spots = prev_pig.get("spots_count", 0)

        deltas = {
            "clarity_delta": round(c_clarity - p_clarity, 1),
            "coverage_delta": round(c_coverage - p_coverage, 2),
            "spots_delta": c_spots - p_spots,
            "improved": c_clarity > p_clarity,
        }

        return {
            "current": {
                "id": current_scan.id,
                "date": current_scan.created_at.strftime("%B %d, %Y"),
                "pigmentation": current_pig,
            },
            "previous": {
                "id": prev_scan.id,
                "date": prev_scan.created_at.strftime("%B %d, %Y"),
                "pigmentation": prev_pig,
            },
            "deltas": deltas,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing scans: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to compare scans.")


# ═══════════════════════════════════════════
# IMAGE SERVING ROUTES (with path traversal protection)
# ═══════════════════════════════════════════

@app.get("/images/original/{filename}")
async def get_original_image(filename: str):
    """Serve original uploaded images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/jpeg")


@app.get("/images/processed/{filename}")
async def get_processed_image(filename: str):
    """Serve processed images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(PROCESSED_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Processed image not found")
    return FileResponse(file_path, media_type="image/png")


@app.get("/results/{filename}")
async def get_result_image(filename: str):
    """Serve detection result images."""
    safe = _safe_filename(filename)
    file_path = os.path.join(RESULTS_DIR, safe)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result image not found")
    return FileResponse(file_path, media_type="image/jpeg")


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
