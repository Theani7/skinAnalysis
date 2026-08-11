import asyncio
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    get_current_user,
)
from services.daraz import search_products_for_recommendations
from services.database import get_db
from services.image_processor import image_processor
from services.models import SavedProduct, Scan
from services.predictor import predictor
from utils import MAX_FILE_SIZE, save_uploaded_file, validate_image

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")


router = APIRouter(prefix='', tags=['products'])

# SAVED PRODUCTS
# ═══════════════════════════════════════════


class SaveProductRequest(BaseModel):
    name: str
    price_show: str
    url: str
    discount: Optional[str] = None
    image: Optional[str] = None
    rating: float = 0.0
    reviews: int = 0
    sold: Optional[str] = None

@router.post("/products/save")
async def save_product(
    req: SaveProductRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(SavedProduct).where(SavedProduct.user_id == user["id"], SavedProduct.url == req.url))
        existing = result.scalar_one_or_none()
        if existing:
            return {"status": "success", "message": "Already saved", "id": existing.id}

        prod = SavedProduct(
            user_id=user["id"],
            name=req.name,
            price_show=req.price_show,
            discount=req.discount,
            image=req.image,
            url=req.url,
            rating=req.rating,
            reviews=req.reviews,
            sold=req.sold
        )
        db.add(prod)
        await db.commit()
        return {"status": "success", "id": prod.id}
    except Exception as e:
        logger.error(f"Error saving product: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save product")

@router.get("/products/saved")
async def get_saved_products(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(SavedProduct)
            .where(SavedProduct.user_id == user["id"])
            .order_by(SavedProduct.created_at.desc())
        )
        products = result.scalars().all()
        return {
            "status": "success",
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "price_show": p.price_show,
                    "discount": p.discount,
                    "image": p.image,
                    "url": p.url,
                    "rating": p.rating,
                    "reviews": p.reviews,
                    "sold": p.sold,
                    "created_at": p.created_at.isoformat()
                } for p in products
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching saved products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load saved products")

@router.delete("/products/saved/{product_id}")
async def remove_saved_product(
    product_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(SavedProduct)
            .where(SavedProduct.user_id == user["id"], SavedProduct.id == product_id)
        )
        prod = result.scalar_one_or_none()
        if not prod:
            return {"status": "success", "message": "Product not found or already removed"}

        await db.delete(prod)
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error removing saved product: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove product")

class UnsaveProductRequest(BaseModel):
    url: str

@router.post("/products/unsave")
async def unsave_product_by_url(
    req: UnsaveProductRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(SavedProduct)
            .where(SavedProduct.user_id == user["id"], SavedProduct.url == req.url)
        )
        prod = result.scalar_one_or_none()
        if not prod:
            return {"status": "success", "message": "Product not found or already removed"}

        await db.delete(prod)
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error removing saved product by url: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove product")


@router.post("/process")
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

        result = await asyncio.to_thread(image_processor.process_image, file_path)

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
        logger.error(f"Processing error: {e}", exc_info=True)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Image processing failed.")
    finally:
        pass


@router.post("/analyze")
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
            predictor._ensure_models_loaded()
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

        # Clean up uploaded file (stored in DB, no longer needed on disk)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

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
                "routine": result.get("routine", {"morning": [], "evening": [], "tips": []}),
                "face_quality": result.get("face_quality"),
                "classification": result.get("classification"),
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")
    finally:
        pass


# ═══════════════════════════════════════════
