import json
import logging
import os
from typing import Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    get_current_user,
)
from services.database import get_db
from services.models import Scan
from utils import MAX_FILE_SIZE, save_uploaded_file, validate_image

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")


router = APIRouter(prefix='', tags=['scans'])

REMOTE_SESSIONS: Dict[str, str] = {}

# PROTECTED CLINICAL ROUTES
# ═══════════════════════════════════════════

@router.post("/upload")
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
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during upload")


# ═══════════════════════════════════════════
# REMOTE CAPTURE ROUTES
# ═══════════════════════════════════════════

@router.post("/remote/upload/{session_id}")
async def remote_upload(session_id: str, file: UploadFile = File(...)):
    """Mobile device uploads the captured image to the session."""
    if not validate_image(file):
        raise HTTPException(status_code=400, detail="Invalid file format")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

    filename = save_uploaded_file(file, contents, UPLOAD_DIR)
    REMOTE_SESSIONS[session_id] = filename
    return {"status": "success"}

@router.get("/remote/status/{session_id}")
async def remote_status(session_id: str):
    """Laptop polls this to see if the mobile device has uploaded an image."""
    filename = REMOTE_SESSIONS.get(session_id)
    if filename:
        return {"status": "ready"}
    return {"status": "waiting"}

@router.get("/remote/download/{session_id}")
async def remote_download(session_id: str):
    """Laptop downloads the image and we clear the session."""
    filename = REMOTE_SESSIONS.get(session_id)
    if not filename:
        raise HTTPException(status_code=404, detail="Session not found or not ready")

    file_path = os.path.join(UPLOAD_DIR, filename)
    if session_id in REMOTE_SESSIONS:
        del REMOTE_SESSIONS[session_id]

    return FileResponse(file_path)


# ═══════════════════════════════════════════
# SCAN HISTORY ROUTES
# ═══════════════════════════════════════════

@router.get("/scans")
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
        logger.error(f"Error listing scans: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load scan history.")


@router.get("/scans/history/progress")
async def get_progress_data(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get progress data for charts: scores over time for this user."""
    try:
        result = await db.execute(
            select(Scan)
            .where(Scan.user_id == user["id"])
            .order_by(Scan.created_at.desc())
            .limit(365)
        )
        scans = list(reversed(result.scalars().all()))

        if not scans:
            return {"progress": [], "recent_scans": [], "latest_stats": None}

        import json
        severity_scores = {"Clear": 100, "Mild": 75, "Moderate": 50, "Severe": 25}
        progress = []
        for s in scans:
            health_score = 50
            if s.pigmentation_data and s.dryness_data:
                try:
                    p_data = json.loads(s.pigmentation_data) if isinstance(s.pigmentation_data, str) else s.pigmentation_data
                    d_data = json.loads(s.dryness_data) if isinstance(s.dryness_data, str) else s.dryness_data

                    clarity = p_data.get("clarity_score", 100) if p_data else 100
                    hydration = d_data.get("hydration_score", 100) if d_data else 100
                    roughness = d_data.get("roughness_score", 0) if d_data else 0

                    score = 100.0
                    score -= min(30, s.acne_count * 2)
                    score -= max(0, 100 - clarity) * 0.3
                    score -= max(0, 100 - hydration) * 0.2
                    score -= min(20, roughness * 2)
                    health_score = max(0, int(round(score)))
                except Exception:
                    health_score = severity_scores.get(s.severity, 50)
            else:
                health_score = severity_scores.get(s.severity, 50)

            progress.append({
                "date": s.created_at.strftime("%b %d"),
                "score": health_score,
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
        logger.error(f"Error fetching progress data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load progress data.")


@router.get("/scans/{scan_id}")
async def get_scan(
    scan_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single scan's full details."""
    try:
        import uuid as _uuid
        try:
            _uuid.UUID(scan_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scan ID format.")

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

        p_data = _safe_json(scan.pigmentation_data, None)
        d_data = _safe_json(scan.dryness_data, None)

        clarity = p_data.get("clarity_score", 100) if p_data else 100
        hydration = d_data.get("hydration_score", 100) if d_data else 100
        roughness = d_data.get("roughness_score", 0) if d_data else 0

        score = 100.0
        score -= min(30, scan.acne_count * 2)
        score -= max(0, 100 - clarity) * 0.3
        score -= max(0, 100 - hydration) * 0.2
        score -= min(20, roughness * 2)
        health_score = max(0, int(round(score)))

        return {
            "id": scan.id,
            "created_at": scan.created_at.isoformat(),
            "original_image": scan.original_image,
            "result_image": scan.result_image,
            "acne_count": scan.acne_count,
            "severity": scan.severity,
            "confidence": scan.confidence,
            "health_score": health_score,
            "spot_types": _safe_json(scan.spot_types, {}),
            "pigmentation_data": p_data,
            "dryness_data": d_data,
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
        logger.error(f"Error fetching scan {scan_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load scan details.")


# ═══════════════════════════════════════════
# PIGMENTATION PROGRESS & COMPARISON
# ═══════════════════════════════════════════


@router.get("/scans/history/pigmentation-progress")
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
        logger.error(f"Error fetching pigmentation progress: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load pigmentation progress.")


@router.get("/scans/{scan_id}/compare")
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
        import uuid as _uuid
        try:
            _uuid.UUID(scan_id)
            if compare_to:
                _uuid.UUID(compare_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scan ID format.")

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
        logger.error(f"Error comparing scans: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to compare scans.")


# ═══════════════════════════════════════════
