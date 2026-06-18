"""
Roboflow Classification Service

Uses the Roboflow Inference SDK to classify skin images.
Model: acne-gnrti/1 (binary acne classification, 84.9% accuracy)

The model auto-downloads and caches weights locally after first call.
Subsequent runs execute entirely locally — no images sent to cloud.
"""

import logging
import os
from typing import Dict

import cv2
import numpy as np

logger = logging.getLogger(__name__)

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "2I3qcAcykaOGBzYoP7QA")
ROBOFLOW_API_URL = "https://serverless.roboflow.com"
ACNE_MODEL_ID = "acne-gnrti/1"


class RoboflowClassifier:
    """Roboflow classification model for skin issue detection."""

    def __init__(self):
        self.client = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy-initialize the Roboflow client on first use."""
        if self._initialized:
            return
        self._initialized = True
        try:
            from inference_sdk import InferenceHTTPClient
            self.client = InferenceHTTPClient(
                api_url=ROBOFLOW_API_URL,
                api_key=ROBOFLOW_API_KEY,
            )
            logger.info("Roboflow classifier initialized (model auto-caches after first call)")
        except ImportError:
            logger.warning("inference-sdk not installed — Roboflow classification disabled")
        except Exception as e:
            logger.error(f"Failed to initialize Roboflow client: {e}")

    def classify_acne(self, image: np.ndarray) -> Dict:
        """
        Classify whether an image contains acne.

        Args:
            image: BGR image (numpy array from cv2)

        Returns:
            {
                "has_acne": bool,
                "confidence": float (0-1),
                "class_name": str,
                "model_id": str,
            }
        """
        self._ensure_initialized()

        default_result = {
            "has_acne": False,
            "confidence": 0.0,
            "class_name": "unknown",
            "model_id": ACNE_MODEL_ID,
        }

        if self.client is None:
            return default_result

        try:
            # Encode image to JPEG for the API
            _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
            temp_path = "/tmp/roboflow_temp.jpg"
            with open(temp_path, "wb") as f:
                f.write(buffer.tobytes())

            result = self.client.infer(temp_path, model_id=ACNE_MODEL_ID)

            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            if not result or "predictions" not in result:
                logger.warning("Roboflow returned empty result")
                return default_result

            predictions = result["predictions"]

            # Binary classification: acne or no_acne
            # predictions is a list of class predictions with confidence
            top_prediction = max(predictions, key=lambda p: p.get("confidence", 0))
            class_name = top_prediction.get("class", "unknown")
            confidence = top_prediction.get("confidence", 0.0)

            has_acne = class_name.lower() in ("acne", "yes", "true", "1") and confidence > 0.5

            return {
                "has_acne": has_acne,
                "confidence": round(float(confidence), 4),
                "class_name": class_name,
                "model_id": ACNE_MODEL_ID,
            }

        except Exception as e:
            logger.warning(f"Roboflow classification failed (non-fatal): {e}")
            if os.path.exists("/tmp/roboflow_temp.jpg"):
                os.remove("/tmp/roboflow_temp.jpg")
            return default_result


# Singleton instance
classifier = RoboflowClassifier()
