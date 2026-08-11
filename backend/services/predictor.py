"""
Acne Detection Predictor Service

Multi-signal acne detection combining:
1. YOLOv8-based face detection (HuggingFace pre-trained)
2. Multi-spectral pigmentation analysis (M-Index + LAB a* + HSV V)
3. Color analysis across HSV, LAB, YCrCb for inflammation detection
4. Texture analysis using Laplacian variance and Gabor filters
5. Local contrast analysis for bump detection
6. Morphological analysis for spot shape/size
"""

import logging
import os
import threading
import uuid
from typing import Dict

import cv2
import numpy as np
from ultralytics import YOLO

from services.pigmentation import detect_pigmentation
from services.roboflow_classifier import classifier
from services.vision_api import analyze_skin_with_gemini

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

YOLO_FACE_MODEL_PATH = os.path.join(MODELS_DIR, "YOLO-face.pt")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)



from services.face_utils import (
    _assess_face_quality,
    _create_face_mask,
    _create_skin_mask,
    _detect_faces_yolo,
    _estimate_face_from_skin,
)
from services.recommendations import _generate_recommendations
from services.skin_metrics import _detect_dryness, _draw_boxes, _nms


class AcnePredictor:
    def __init__(self):
        self.acne_detector = None
        self.model_loaded = False
        self.yolo_face = None
        self._models_loaded = False
        self._model_lock = threading.Lock()

    def _ensure_models_loaded(self):
        """Lazy-load models on first use instead of at import time."""
        if self._models_loaded:
            return
        with self._model_lock:
            if self._models_loaded:
                return
            self._models_loaded = True
            self._load_yolo_face_detector()
            self._load_model()

    def _load_yolo_face_detector(self):
        """Load YOLOv8 face detection model from local file."""
        try:
            if not os.path.exists(YOLO_FACE_MODEL_PATH):
                logger.error(f"YOLO face model not found at {YOLO_FACE_MODEL_PATH}")
                return
            self.yolo_face = YOLO(YOLO_FACE_MODEL_PATH)
            logger.info("YOLO face detection model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLO face detector: {e}")
            self.yolo_face = None

    def _load_model(self):
        try:
            from services.acne_model import AcneDetector
            self.acne_detector = AcneDetector(conf_threshold=0.25, iou_threshold=0.45)
            self.model_loaded = self.acne_detector.model is not None
            if self.model_loaded:
                logger.info(f"Acne model loaded (type: {self.acne_detector.model_type})")
            else:
                logger.warning("No acne model available")
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            self.model_loaded = False

    def analyze_image(self, image_path: str) -> Dict:
        self._ensure_models_loaded()
        try:
            orig_image = cv2.imread(image_path)
            if orig_image is None:
                raise ValueError(f"Cannot read image: {image_path}")

            orig_h, orig_w = orig_image.shape[:2]
            image = orig_image.copy()

            # Resize for consistent processing
            max_dim = 800
            scale = min(max_dim / orig_w, max_dim / orig_h, 1.0)
            if scale < 1.0:
                image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

            # Detect face regions using YOLO
            face_regions = _detect_faces_yolo(image, self.yolo_face) if self.yolo_face else []

            # Create precise face-only mask (elliptical + skin color refined)
            face_mask = _create_face_mask(image, face_regions)

            # Also create a general skin mask for fallback
            skin_mask = _create_skin_mask(image)

            # Use face_mask as primary — it's precise and face-only
            if np.count_nonzero(face_mask) > 100:
                skin_mask = face_mask
                logger.info(f"Face detected: {len(face_regions)} region(s), mask pixels: {np.count_nonzero(face_mask)}")
            else:
                # Fallback: estimate face from largest skin cluster
                fallback_regions = _estimate_face_from_skin(skin_mask)
                if fallback_regions:
                    face_mask = _create_face_mask(image, fallback_regions)
                    if np.count_nonzero(face_mask) > 100:
                        skin_mask = face_mask
                        logger.info(f"Face estimated from skin cluster: mask pixels: {np.count_nonzero(face_mask)}")
                    else:
                        # Close-up fallback: use wide-range skin mask or full image
                        wide_skin = _create_skin_mask(image)
                        if np.count_nonzero(wide_skin) > 500:
                            logger.info(f"Close-up detected — using wide skin mask: {np.count_nonzero(wide_skin)} pixels")
                            skin_mask = wide_skin
                        else:
                            logger.info("Close-up detected — using full image as skin region")
                            skin_mask = np.ones((image.shape[0], image.shape[1]), dtype=np.uint8) * 255
                else:
                    # No face and no skin cluster — close-up fallback
                    wide_skin = _create_skin_mask(image)
                    if np.count_nonzero(wide_skin) > 500:
                        logger.info(f"No face — using wide skin mask: {np.count_nonzero(wide_skin)} pixels")
                        skin_mask = wide_skin
                    else:
                        logger.info("No face — using full image as skin region")
                        skin_mask = np.ones((image.shape[0], image.shape[1]), dtype=np.uint8) * 255

            # Assess face quality for the primary face
            face_quality = None
            if face_regions and face_regions[0] != (0, 0, image.shape[1], image.shape[0]):
                face_quality = _assess_face_quality(image, face_regions[0])

            all_detections = []
            if self.acne_detector is not None and self.acne_detector.model is not None:
                img_h, img_w = image.shape[:2]

                if face_regions:
                    # Run detector on each face crop
                    for (fx1, fy1, fx2, fy2) in face_regions:
                        face_crop = image[fy1:fy2, fx1:fx2]
                        if face_crop.shape[0] < 16 or face_crop.shape[1] < 16:
                            continue

                        result = self.acne_detector.detect(face_crop)
                        crop_h, crop_w = face_crop.shape[:2]

                        for det in result["detections"]:
                            bx1, by1, bx2, by2 = [int(v) for v in det["bbox"]]
                            bx1 = max(0, min(bx1, crop_w - 1))
                            by1 = max(0, min(by1, crop_h - 1))
                            bx2 = max(bx1 + 3, min(bx2, crop_w))
                            by2 = max(by1 + 3, min(by2, crop_h))

                            # Map back to original image coordinates
                            det["bbox"] = [bx1 + fx1, by1 + fy1, bx2 + fx1, by2 + fy1]
                            all_detections.append(det)

                        logger.info(f"Detector found {len(result['detections'])} acne spots in face region")
                else:
                    # No face detected — run detector on full image
                    logger.info("No face detected — running detector on full image")
                    result = self.acne_detector.detect(image)
                    all_detections = result["detections"]
                    logger.info(f"Detector found {len(result['detections'])} acne spots in full image")

            all_detections = _nms(all_detections)
            # Ensure all bbox values are int (clustering NMS returns floats)
            for det in all_detections:
                det["bbox"] = [int(v) for v in det["bbox"]]

            # --- Pigmentation Detection ---
            # Create acne mask for red inhibition (using detections in current image scale)
            acne_mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
            for det in all_detections:
                bx1, by1, bx2, by2 = det["bbox"]
                bx1, by1 = max(0, bx1), max(0, by1)
                bx2, by2 = min(image.shape[1], bx2), min(image.shape[0], by2)
                if bx2 > bx1 and by2 > by1:
                    cv2.rectangle(acne_mask, (bx1, by1), (bx2, by2), 255, -1)

            pigment_result = detect_pigmentation(image, skin_mask, acne_mask, face_regions)

            # Call Gemini Vision API (if configured) to override heuristics
            gemini_results = analyze_skin_with_gemini(orig_image)
            if gemini_results:
                logger.info("Overriding heuristic scores with Gemini Vision API")
                pigment_result["clarity_score"] = gemini_results.get("pigmentation", {}).get("clarity_score", pigment_result["clarity_score"])
                pigment_result["intensity"] = gemini_results.get("pigmentation", {}).get("intensity", pigment_result["intensity"])

            # Generate heatmap using jet colormap with intensity gradient
            heatmap = image.copy().astype(np.uint8)
            intensity_map = pigment_result.get("intensity_map")
            mask = pigment_result.get("mask")

            if mask is not None and intensity_map is not None and mask.shape == image.shape[:2]:
                spot_pixels = mask > 0
                if np.any(spot_pixels):
                    jet_colormap = cv2.applyColorMap(
                        (intensity_map * 255).astype(np.uint8), cv2.COLORMAP_JET
                    )
                    alpha = 0.55
                    heatmap[spot_pixels] = cv2.addWeighted(
                        image[spot_pixels].astype(np.uint8), 1 - alpha,
                        jet_colormap[spot_pixels], alpha, 0,
                    ).astype(np.uint8)
            else:
                logger.warning("Pigmentation mask/intensity_map shape mismatch or missing")

            pigment_filename = f"pigment_{uuid.uuid4().hex[:8]}.jpg"
            pigment_path = os.path.join(RESULTS_DIR, pigment_filename)
            if face_regions:
                for (fx1, fy1, fx2, fy2) in face_regions:
                    cv2.rectangle(heatmap, (fx1, fy1), (fx2, fy2), (255, 180, 0), 2)
            cv2.imwrite(pigment_path, heatmap)

            pigmentation_data = {
                "clarity_score": pigment_result["clarity_score"],
                "spots_count": pigment_result["spots_count"],
                "intensity": pigment_result["intensity"],
                "normalized_coverage": pigment_result["normalized_coverage"],
                "face_area": pigment_result["face_area"],
                "spatial_pattern": pigment_result["spatial_pattern"],
                "heatmap_image": pigment_filename,
                "type_distribution": pigment_result["type_distribution"],
            }

            # --- Dryness Detection ---
            dryness_result = _detect_dryness(image, skin_mask)

            if gemini_results:
                dryness_result["hydration_score"] = gemini_results.get("dryness", {}).get("hydration_score", dryness_result["hydration_score"])
                dryness_result["roughness_score"] = gemini_results.get("dryness", {}).get("roughness_score", dryness_result["roughness_score"])

            # Generate texture heatmap (Teal/Cyan)
            texture_map = image.copy()
            t_mask = dryness_result.get("mask")
            if t_mask is not None and t_mask.shape == image.shape[:2]:
                # Teal color in BGR: (255, 255, 0) - wait, Cyan is (255, 255, 0) in BGR
                texture_map[t_mask > 0] = (235, 206, 135) # Sky blue / Teal-ish
                cv2.addWeighted(texture_map, 0.5, image, 0.5, 0, texture_map)

            texture_filename = f"texture_{uuid.uuid4().hex[:8]}.jpg"
            texture_path = os.path.join(RESULTS_DIR, texture_filename)
            # Draw face box on moisture heatmap
            if face_regions:
                for (fx1, fy1, fx2, fy2) in face_regions:
                    cv2.rectangle(texture_map, (fx1, fy1), (fx2, fy2), (255, 180, 0), 2)
            cv2.imwrite(texture_path, texture_map)

            dryness_data = {
                "hydration_score": dryness_result["hydration_score"],
                "roughness_score": dryness_result["roughness_score"],
                "flakes_count": dryness_result["flakes_count"],
                "texture_map_image": texture_filename
            }

            acne_count = len(all_detections)
            if acne_count == 0:
                severity = "Clear"
            elif acne_count <= 5:
                severity = "Mild"
            elif acne_count <= 15:
                severity = "Moderate"
            else:
                severity = "Severe"

            avg_conf = float(np.mean([d["confidence"] for d in all_detections])) if all_detections else 0.0

            # Roboflow classification (non-blocking, adds confidence score)
            try:
                classification = classifier.classify_acne(image)
            except Exception as e:
                logger.warning(f"Classification skipped: {e}")
                classification = {"has_acne": acne_count > 0, "confidence": avg_conf, "class_name": "unknown", "model_id": "fallback"}

            # Scale detections back to original image dimensions for result image
            orig_img_h, orig_img_w = orig_image.shape[:2]
            if scale < 1.0:
                inv_scale = 1.0 / scale
                for det in all_detections:
                    bx1, by1, bx2, by2 = det["bbox"]
                    det["bbox"] = [max(0, int(bx1 * inv_scale)), max(0, int(by1 * inv_scale)),
                                   min(orig_img_w, int(bx2 * inv_scale)),
                                   min(orig_img_h, int(by2 * inv_scale))]

            result_image = _draw_boxes(orig_image, all_detections)

            result_filename = f"detection_{uuid.uuid4().hex[:8]}.jpg"
            result_path = os.path.join(RESULTS_DIR, result_filename)
            cv2.imwrite(result_path, result_image)

            spot_types = {}
            for d in all_detections:
                t = d.get("type", "unknown")
                spot_types[t] = spot_types.get(t, 0) + 1

            recommendation_data = _generate_recommendations(acne_count, severity, pigmentation_data, dryness_data, spot_types)

            # --- Health Score Algorithm ---
            clarity = pigmentation_data.get("clarity_score", 100) if pigmentation_data else 100
            hydration = dryness_data.get("hydration_score", 100) if dryness_data else 100
            roughness = dryness_data.get("roughness_score", 0) if dryness_data else 0

            score = 100.0
            # Acne penalty: up to 30 points (2 points per spot)
            score -= min(30, acne_count * 2)
            # Pigmentation penalty: up to 30 points
            score -= max(0, 100 - clarity) * 0.3
            # Hydration penalty: up to 20 points
            score -= max(0, 100 - hydration) * 0.2
            # Texture penalty: up to 20 points
            score -= min(20, roughness * 2)

            health_score = max(0, int(round(score)))

            return {
                "status": "success",
                "acne_count": acne_count,
                "severity": severity,
                "confidence": round(avg_conf, 4),
                "health_score": health_score,
                "detections": all_detections,
                "result_image": result_filename,
                "result_path": result_path,
                "spot_types": spot_types,
                "pigmentation_data": pigmentation_data,
                "dryness_data": dryness_data,
                "recommendations": recommendation_data["recommendations"],
                "conflicts": recommendation_data["conflicts"],
                "routine": recommendation_data["routine"],
                "face_quality": face_quality,
                "classification": classification,
            }

        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e),
                "acne_count": 0,
                "severity": "Unknown",
                "confidence": 0.0,
                "health_score": 0,
                "detections": [],
                "result_image": None,
                "recommendations": [],
                "conflicts": [],
                "routine": {"morning": [], "evening": [], "tips": []},
                "face_quality": None,
            }

predictor = AcnePredictor()
