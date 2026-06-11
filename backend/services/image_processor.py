import cv2
import numpy as np
import os
import uuid
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

PROCESSED_DIR = "/Users/theani7x/Downloads/skin-diseases/backend/processed"
TARGET_SIZE = (224, 224)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}


class ImageProcessor:
    """Service for preprocessing skin images before AI analysis."""

    def __init__(self):
        os.makedirs(PROCESSED_DIR, exist_ok=True)
        logger.info(f"ImageProcessor initialized. Output dir: {PROCESSED_DIR}")

    def validate_image(self, filename: str) -> bool:
        """Validate image file extension."""
        if not filename:
            return False
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return extension in ALLOWED_EXTENSIONS

    def read_image(self, image_path: str) -> np.ndarray:
        """Read image from disk using OpenCV."""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to read image: {image_path}")
        return image

    def resize_image(self, image: np.ndarray, size: tuple = TARGET_SIZE) -> np.ndarray:
        """Resize image to target size."""
        return cv2.resize(image, size, interpolation=cv2.INTER_LANCZOS4)

    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        """Normalize pixel values to 0-1 range."""
        return image.astype(np.float32) / 255.0

    def denormalize_image(self, image: np.ndarray) -> np.ndarray:
        """Convert normalized image back to uint8 for saving."""
        return (image * 255).astype(np.uint8)

    def apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """Apply Contrast Limited Adaptive Histogram Equalization."""
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)

        enhanced_lab = cv2.merge([l_channel, a_channel, b_channel])
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    def reduce_noise(self, image: np.ndarray) -> np.ndarray:
        """Apply Gaussian blur for noise reduction."""
        return cv2.GaussianBlur(image, (3, 3), 0)

    def process_image(self, image_path: str) -> dict:
        """
        Full preprocessing pipeline:
        1. Read image
        2. Apply CLAHE enhancement
        3. Reduce noise
        4. Resize to 224x224
        5. Normalize pixel values
        6. Save processed image
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]

        original_filename = os.path.basename(image_path)
        original_name_no_ext = os.path.splitext(original_filename)[0]

        processed_filename = f"{timestamp}_{unique_id}_{original_name_no_ext}_processed.png"
        processed_path = os.path.join(PROCESSED_DIR, processed_filename)

        logger.info(f"Processing image: {original_filename}")

        image = self.read_image(image_path)
        logger.info(f"Image read successfully. Shape: {image.shape}")

        enhanced = self.apply_clahe(image)
        logger.info("CLAHE enhancement applied")

        denoised = self.reduce_noise(enhanced)
        logger.info("Noise reduction applied")

        resized = self.resize_image(denoised)
        logger.info(f"Image resized to: {resized.shape}")

        normalized = self.normalize_image(resized)
        logger.info("Image normalized")

        savable = self.denormalize_image(normalized)
        cv2.imwrite(processed_path, savable)
        logger.info(f"Processed image saved: {processed_path}")

        return {
            "original_filename": original_filename,
            "processed_filename": processed_filename,
            "original_path": image_path,
            "processed_path": processed_path,
            "original_size": os.path.getsize(image_path),
            "processed_size": os.path.getsize(processed_path),
            "dimensions": {"width": TARGET_SIZE[0], "height": TARGET_SIZE[1]},
            "normalized": True,
        }


image_processor = ImageProcessor()