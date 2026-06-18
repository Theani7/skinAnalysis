"""
Acne Detection Model — YOLOv8 Detection

Uses a YOLOv8 detector trained on acne bounding box dataset.
Detects individual acne spots with bounding boxes.
"""

import logging
import os
from typing import Dict

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DETECTOR_PATH = os.path.join(BACKEND_DIR, "models", "best.pt")
FALLBACK_H5_PATH = os.path.join(BACKEND_DIR, "model", "yolo_acne_detection.h5")


class AcneDetector:
    """YOLOv8-based acne detector for individual spot detection."""

    def __init__(self, conf_threshold: float = 0.25, iou_threshold: float = 0.45):
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model = None
        self.model_type = None
        self._load()

    def _load(self):
        # Try detector first (bounding boxes)
        if os.path.exists(DETECTOR_PATH):
            try:
                self.model = YOLO(DETECTOR_PATH)
                self.model_type = "detector"
                logger.info(f"YOLOv8 detector loaded: {DETECTOR_PATH}")
                return
            except Exception as e:
                logger.warning(f"Failed to load detector: {e}")

        # Legacy H5 fallback
        if os.path.exists(FALLBACK_H5_PATH):
            try:
                self._load_h5_fallback(FALLBACK_H5_PATH)
                return
            except Exception as e:
                logger.warning(f"Failed to load H5 fallback: {e}")

        logger.warning("No acne model found — detection disabled")

    def _load_h5_fallback(self, h5_path: str):
        from services.acne_model_legacy import Yolov8Detector
        self.model = Yolov8Detector(h5_path, conf_threshold=self.conf_threshold)
        self.model_type = "h5_legacy"
        logger.info(f"H5 legacy model loaded: {h5_path}")

    def detect(self, image: np.ndarray) -> Dict:
        """
        Run detection on an image.

        Returns:
            {
                "detections": List[Dict] with bbox, confidence, class_name
                "acne_prob": float (overall acne probability)
                "has_acne": bool
            }
        """
        if self.model is None:
            return {"detections": [], "acne_prob": 0.0, "has_acne": False}

        if self.model_type == "detector":
            return self._detect_yolo(image)
        elif self.model_type == "classifier":
            return self._classify_yolo(image)
        elif self.model_type == "h5_legacy":
            return self._detect_h5(image)
        else:
            return {"detections": [], "acne_prob": 0.0, "has_acne": False}

    def _detect_yolo(self, image: np.ndarray) -> Dict:
        """Run YOLOv8 detector — returns individual bounding boxes."""
        results = self.model(image, conf=self.conf_threshold, iou=self.iou_threshold, verbose=False)

        detections = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": round(conf, 4),
                    "class_name": "acne",
                    "type": _classify_spot_type(image, int(x1), int(y1), int(x2), int(y2)),
                })

        acne_prob = min(1.0, len(detections) * 0.15) if detections else 0.0

        return {
            "detections": detections,
            "acne_prob": round(acne_prob, 4),
            "has_acne": len(detections) > 0,
        }

    def _classify_yolo(self, image: np.ndarray) -> Dict:
        """Run YOLOv8 classifier (fallback)."""
        results = self.model(image, verbose=False)

        probs = results[0].probs
        class_names = results[0].names
        scores = probs.data.cpu().numpy()

        acne_idx = None
        for idx, name in class_names.items():
            if "acne" in name.lower():
                acne_idx = idx
                break

        acne_prob = float(scores[acne_idx]) if acne_idx is not None else 0.0
        has_acne = acne_prob > 0.5

        # No individual detections from classifier
        return {
            "detections": [],
            "acne_prob": round(acne_prob, 4),
            "has_acne": has_acne,
        }

    def _detect_h5(self, image: np.ndarray) -> Dict:
        """Fallback: legacy H5 model."""
        detections = self.model.detect(image)
        acne_prob = min(1.0, len(detections) * 0.1) if detections else 0.0
        return {
            "detections": detections,
            "acne_prob": round(acne_prob, 4),
            "has_acne": len(detections) > 0,
        }


def _classify_spot_type(image: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> str:
    """Classify the type of acne spot based on color features."""
    h, w = image.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    if x2 <= x1 or y2 <= y1:
        return "acne"

    roi = image[y1:y2, x1:x2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)

    v_mean = np.mean(hsv[:, :, 2])
    s_mean = np.mean(hsv[:, :, 1])
    a_mean = np.mean(lab[:, :, 1])

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    dark_ratio = np.mean(gray < 80)

    if dark_ratio > 0.4 and v_mean < 100:
        return "blackhead"
    if a_mean > 140 and s_mean > 50:
        return "papule"
    if v_mean > 200 and s_mean < 35:
        return "whitehead"
    if s_mean > 60 and 15 < np.mean(hsv[:, :, 0]) < 35:
        return "pustule"
    return "acne"
