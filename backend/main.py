"""
SkinAI Backend - FastAPI Application

Main entry point for the acne detection API.
Provides endpoints for image upload, processing, and AI analysis.
JWT-based authentication for all clinical endpoints.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
import os
import uuid
import json
from datetime import datetime
import logging
import traceback

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from services.database import init_db, get_db
from services.models import User, Scan
from services.image_processor import image_processor
from services.predictor import predictor
from services.auth import (
    register_user,
    login_user,
    get_current_user,
    update_user_profile,
    UserCreate,
    UserLogin,
    UserUpdate,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("SKINAI_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    extension = file.filename.split(".")[-1].lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(directory, unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    return unique_filename


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "SkinAI API v3.0", "status": "healthy"}


# ═══════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════

@app.post("/auth/register")
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    try:
        return await register_user(data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@app.post("/auth/login")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
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
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")


@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze image for acne detection using YOLOv8 model. (Requires authentication)"""
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

        result = predictor.analyze_image(file_path)

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {result.get('message', 'Unknown error')}",
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
                "recommendations": result.get("recommendations", []),
                "conflicts": result.get("conflicts", []),
                "routine": result.get("routine", {"morning": [], "evening": [], "tips": []}),
                "face_quality": result.get("face_quality"),
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Analysis error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


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
    result = await db.execute(
        select(Scan)
        .where(Scan.user_id == user["id"])
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    scans = result.scalars().all()

    # Get total count for pagination
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


@app.get("/scans/history/progress")
async def get_progress_data(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get progress data for charts: scores over time for this user."""
    result = await db.execute(
        select(Scan)
        .where(Scan.user_id == user["id"])
        .order_by(Scan.created_at.asc())
    )
    scans = result.scalars().all()

    if not scans:
        return {"progress": [], "recent_scans": [], "latest_stats": None}

    # Build progress data points (date → severity score)
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

    # Get latest scan stats
    latest = scans[-1]
    latest_stats = {
        "acne_count": latest.acne_count,
        "severity": latest.severity,
        "confidence": latest.confidence,
    }

    # Get recent 5 scans for dashboard list
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


@app.get("/scans/{scan_id}")
async def get_scan(
    scan_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single scan's full details."""
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id, Scan.user_id == user["id"])
    )
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    return {
        "id": scan.id,
        "created_at": scan.created_at.isoformat(),
        "original_image": scan.original_image,
        "result_image": scan.result_image,
        "acne_count": scan.acne_count,
        "severity": scan.severity,
        "confidence": scan.confidence,
        "spot_types": json.loads(scan.spot_types),
        "pigmentation_data": json.loads(scan.pigmentation_data),
        "dryness_data": json.loads(scan.dryness_data),
        "recommendations": json.loads(scan.recommendations),
        "conflicts": json.loads(scan.conflicts),
        "routine": json.loads(scan.routine),
        "face_quality": json.loads(scan.face_quality),
        "original_path": f"/images/original/{scan.original_image}",
        "result_path": f"/results/{scan.result_image}",
    }


# ═══════════════════════════════════════════
# IMAGE SERVING ROUTES
# ═══════════════════════════════════════════

@app.get("/images/original/{filename}")
async def get_original_image(filename: str):
    """Serve original uploaded images."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/jpeg")


@app.get("/images/processed/{filename}")
async def get_processed_image(filename: str):
    """Serve processed images."""
    file_path = os.path.join(PROCESSED_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Processed image not found")
    return FileResponse(file_path, media_type="image/png")


@app.get("/results/{filename}")
async def get_result_image(filename: str):
    """Serve detection result images."""
    file_path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result image not found")
    return FileResponse(file_path, media_type="image/jpeg")


@app.get("/model/status")
async def get_model_status():
    """Check AI model status."""
    return {
        "model_loaded": predictor.model_loaded,
        "model_path": "/model/model.h5",
        "input_size": "640x640",
        "confidence_threshold": 0.25,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
