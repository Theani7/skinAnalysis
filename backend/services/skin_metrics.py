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
from typing import Dict, List

import cv2
import numpy as np

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

YOLO_FACE_MODEL_PATH = os.path.join(MODELS_DIR, "YOLO-face.pt")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)



def _detect_dryness(image: np.ndarray, skin_mask: np.ndarray) -> Dict:
    """
    Detect skin dryness and texture issues using Gabor filters and White Top-Hat.
    Identifies high-frequency micro-cracks and surface flakiness.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 1. Crack Detection using Gabor Filters
    # We look for fine, multi-directional high-frequency lines
    gabor_kernels = []
    for theta in [0, np.pi/4, np.pi/2, 3*np.pi/4]:
        kernel = cv2.getGaborKernel((9, 9), 1.5, theta, 5.0, 0.5, 0, ktype=cv2.CV_32F)
        gabor_kernels.append(kernel)

    gabor_result = np.zeros_like(gray, dtype=np.float32)
    for k in gabor_kernels:
        filtered = cv2.filter2D(gray, cv2.CV_32F, k)
        gabor_result = np.maximum(gabor_result, filtered)

    gabor_norm = cv2.normalize(gabor_result, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # 2. Flakiness Detection (White Top-Hat)
    # Isolates small bright anomalies (flakes)
    kernel_flake = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel_flake)

    # 3. Combine and Threshold
    # Weight cracks more than flakes for overall texture analysis
    texture_signal = cv2.addWeighted(gabor_norm, 0.7, tophat, 0.3, 0)
    texture_signal = cv2.bitwise_and(texture_signal, skin_mask)

    # Adaptive threshold to find dry patches relative to skin tone
    _, thresh = cv2.threshold(texture_signal, np.mean(texture_signal[skin_mask > 0]) + 2*np.std(texture_signal[skin_mask > 0]), 255, cv2.THRESH_BINARY)

    # 4. Metrics
    skin_area = np.count_nonzero(skin_mask)
    dry_area = np.count_nonzero(thresh)
    roughness_ratio = (dry_area / skin_area) * 100 if skin_area > 0 else 0

    # Hydration Score: 100 is perfect, 15% roughness is 0
    hydration_score = max(0, min(100, 100 - (roughness_ratio * 6.6)))

    # Flakes count (bright clusters)
    _, flake_thresh = cv2.threshold(tophat, 200, 255, cv2.THRESH_BINARY)
    flake_thresh = cv2.bitwise_and(flake_thresh, skin_mask)
    contours, _ = cv2.findContours(flake_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    return {
        "hydration_score": round(hydration_score, 1),
        "roughness_score": round(roughness_ratio, 1),
        "flakes_count": len([c for c in contours if cv2.contourArea(c) > 2]),
        "mask": thresh
    }


def _nms(detections: List[Dict]) -> List[Dict]:
    """NMS followed by distance-based clustering to merge nearby detections."""
    if len(detections) <= 1:
        return detections

    boxes = np.array([d["bbox"] for d in detections])
    scores = np.array([d["confidence"] for d in detections])

    # First pass: standard NMS
    cv_boxes = [[int(b[0]), int(b[1]), int(b[2]-b[0]), int(b[3]-b[1])] for b in boxes]
    indices = cv2.dnn.NMSBoxes(cv_boxes, scores.tolist(), 0.3, 0.6)
    if len(indices) > 0:
        if isinstance(indices, np.ndarray):
            indices = indices.flatten()
        detections = [detections[i] for i in indices]
    else:
        return []

    # Second pass: cluster by center distance (merge boxes within 25px)
    boxes = np.array([d["bbox"] for d in detections])
    scores_arr = np.array([d["confidence"] for d in detections])
    centers = np.column_stack([(boxes[:, 0] + boxes[:, 2]) / 2,
                                (boxes[:, 1] + boxes[:, 3]) / 2])

    merge_dist = 25.0
    merged = set()
    clusters = []

    for i in range(len(boxes)):
        if i in merged:
            continue
        cluster = [i]
        merged.add(i)
        for j in range(i + 1, len(boxes)):
            if j in merged:
                continue
            if np.linalg.norm(centers[i] - centers[j]) < merge_dist:
                cluster.append(j)
                merged.add(j)
        clusters.append(cluster)

    result = []
    for cluster in clusters:
        cluster_boxes = boxes[cluster]
        cluster_scores = scores_arr[cluster]
        merged_box = [
            float(cluster_boxes[:, 0].min()),
            float(cluster_boxes[:, 1].min()),
            float(cluster_boxes[:, 2].max()),
            float(cluster_boxes[:, 3].max()),
        ]
        top_idx = cluster_scores.argmax()
        result.append({
            "bbox": merged_box,
            "confidence": float(cluster_scores.max()),
            "class_name": "acne",
            "type": detections[cluster[top_idx]].get("type", "acne"),
        })
    return result


def _draw_boxes(image: np.ndarray, detections: List[Dict]) -> np.ndarray:
    """Draw detection results on image."""
    output = image.copy()

    type_colors = {
        "inflammatory": (0, 0, 255),
        "papule": (0, 100, 255),
        "pustule": (0, 200, 255),
        "whitehead": (0, 255, 255),
        "blackhead": (100, 100, 100),
        "comedone": (0, 200, 0),
    }

    for i, det in enumerate(detections):
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        conf = det["confidence"]
        spot_type = det.get("type", "acne")
        color = type_colors.get(spot_type, (0, 255, 0))

        cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)

        label = f"{spot_type}: {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(output, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(output, label, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    return output
