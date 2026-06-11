"""
SkinAI Backend - FastAPI Application

Main entry point for the acne detection API.
Provides endpoints for image upload, processing, and AI analysis.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
from datetime import datetime
import logging
import traceback

from services.image_processor import image_processor
from services.predictor import predictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SkinAI API",
    description="API for acne detection and skin analysis",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/Users/theani7x/Downloads/skin-diseases/backend/uploads"
PROCESSED_DIR = "/Users/theani7x/Downloads/skin-diseases/backend/processed"
RESULTS_DIR = "/Users/theani7x/Downloads/skin-diseases/backend/results"

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


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file.
    
    Returns:
        JSON with upload status and file information
    """
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed"
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
async def process_image(file: UploadFile = File(...)):
    """
    Process image with OpenCV preprocessing pipeline.
    
    Returns:
        JSON with processing results and file paths
    """
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed"
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
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze image for acne detection using YOLOv8 model.
    
    Returns:
        JSON with detection results including acne count, severity, and confidence
    """
    try:
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only JPG, JPEG, and PNG files are allowed"
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")

        if not predictor.model_loaded:
            raise HTTPException(
                status_code=503,
                detail="AI model not available. Please check model file."
            )

        filename = save_uploaded_file(file, contents, UPLOAD_DIR)
        file_path = os.path.join(UPLOAD_DIR, filename)

        logger.info(f"Analyzing image: {filename}")
        
        result = predictor.analyze_image(file_path)

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {result.get('message', 'Unknown error')}"
            )

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
            },
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Analysis error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


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


@app.get("/uploads")
async def list_uploads():
    """List all uploaded images."""
    try:
        files = os.listdir(UPLOAD_DIR)
        file_info = []
        for filename in files:
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                file_info.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })
        return {"files": file_info}
    except Exception as e:
        logger.error(f"Error listing uploads: {e}")
        raise HTTPException(status_code=500, detail="Failed to list uploaded files")


@app.get("/model/status")
async def get_model_status():
    """Check AI model status."""
    return {
        "model_loaded": predictor.model_loaded,
        "opencv_fallback": predictor.use_opencv_fallback,
        "model_path": "/model/model.h5",
        "input_size": "640x640",
        "confidence_threshold": 0.25
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)