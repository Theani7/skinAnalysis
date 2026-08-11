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


def _detect_acne_spots(image: np.ndarray, skin_mask: np.ndarray) -> List[Dict]:
    """
    Detect acne spots using multiple independent color signals
    combined with local contrast and shape analysis.
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h_ch, s_ch, v_ch = cv2.split(hsv)
    l_ch, a_ch, b_ch = cv2.split(lab)

    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    kernel_med = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    # ---- Signal 1: Red/inflamed regions ----
    red_mask1 = cv2.inRange(hsv, np.array([0, 35, 60]), np.array([14, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([165, 35, 60]), np.array([180, 255, 255]))
    red_hsv = cv2.bitwise_or(red_mask1, red_mask2)

    # High a-channel (redness in LAB)
    a_blur = cv2.GaussianBlur(a_ch, (5, 5), 0)
    a_thresh = cv2.adaptiveThreshold(a_blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY, 15, -5)
    red_lab = cv2.bitwise_and(red_hsv, a_thresh)

    # ---- Signal 2: Dark spots (blackheads) ----
    dark_v = cv2.inRange(v_ch, 0, 75)
    dark_gray = cv2.inRange(gray, 0, int(np.mean(gray) * 0.6))
    dark_mask = cv2.bitwise_or(dark_v, dark_gray)

    # ---- Signal 3: Whiteheads (bright raised bumps) ----
    bright_mask = cv2.inRange(v_ch, 200, 255)
    low_sat = cv2.inRange(s_ch, 0, 35)
    white_mask = cv2.bitwise_and(bright_mask, low_sat)

    # ---- Signal 4: Yellow pustules ----
    yellow_mask = cv2.inRange(hsv, np.array([15, 25, 160]), np.array([35, 200, 255]))

    # ---- Signal 5: Texture bumps (Laplacian) ----
    lap = cv2.Laplacian(gray.astype(np.float32), cv2.CV_32F)
    lap_abs = np.abs(lap)
    lap_blur = cv2.GaussianBlur(lap_abs, (5, 5), 0)
    lap_thresh = (lap_blur > np.mean(lap_blur) + 1.5 * np.std(lap_blur)).astype(np.uint8) * 255

    # ---- Combine signals independently (OR logic) ----
    color_signals = np.zeros_like(gray)
    color_signals = cv2.bitwise_or(color_signals, red_lab)
    color_signals = cv2.bitwise_or(color_signals, dark_mask)
    color_signals = cv2.bitwise_or(color_signals, white_mask)
    color_signals = cv2.bitwise_or(color_signals, yellow_mask)

    # Use texture as a boost, not a gate
    boosted = cv2.add(color_signals, cv2.bitwise_and(lap_thresh, np.full_like(lap_thresh, 80)))

    # Apply skin mask
    boosted = cv2.bitwise_and(boosted, skin_mask)

    # Morphological cleanup
    boosted = cv2.morphologyEx(boosted, cv2.MORPH_CLOSE, kernel_med, iterations=2)
    boosted = cv2.morphologyEx(boosted, cv2.MORPH_OPEN, kernel_small, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(boosted, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 15 or area > 3000:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)

        x, y, w, h = cv2.boundingRect(contour)
        aspect = float(w) / h if h > 0 else 0
        if aspect > 4 or aspect < 0.25:
            continue

        # Extract ROI for analysis
        rx1 = max(0, x)
        ry1 = max(0, y)
        rx2 = min(image.shape[1], x + w)
        ry2 = min(image.shape[0], y + h)
        if rx2 <= rx1 or ry2 <= ry1:
            continue

        roi = image[ry1:ry2, rx1:rx2]
        roi_hsv = hsv[ry1:ry2, rx1:rx2]
        roi_lab = lab[ry1:ry2, rx1:rx2]

        # Compute confidence from multiple signals
        conf = 0.3

        # Color features
        h_mean = np.mean(roi_hsv[:, :, 0])
        s_mean = np.mean(roi_hsv[:, :, 1])
        v_mean = np.mean(roi_hsv[:, :, 2])
        a_mean = np.mean(roi_lab[:, :, 1])

        # Red/inflamed
        red_pixels = np.count_nonzero(red_lab[ry1:ry2, rx1:rx2])
        red_ratio = red_pixels / max(1, roi.size // 3)
        if red_ratio > 0.15:
            conf += 0.25
        elif red_ratio > 0.05:
            conf += 0.15

        # Dark spot
        dark_pixels = np.count_nonzero(dark_mask[ry1:ry2, rx1:rx2])
        dark_ratio = dark_pixels / max(1, roi.size // 3)
        if dark_ratio > 0.3:
            conf += 0.15

        # Whitehead
        white_pixels = np.count_nonzero(white_mask[ry1:ry2, rx1:rx2])
        white_ratio = white_pixels / max(1, roi.size // 3)
        if white_ratio > 0.2:
            conf += 0.15

        # Shape boost
        if circularity > 0.5:
            conf += 0.1
        elif circularity > 0.3:
            conf += 0.05

        # Size boost
        if 20 < area < 400:
            conf += 0.05

        # High a-channel (inflammation)
        if a_mean > 140:
            conf += 0.1

        # Local contrast (bumps are brighter than surroundings)
        local_mean = np.mean(gray[max(0,y-10):min(gray.shape[0],y+h+10),
                                   max(0,x-10):min(gray.shape[1],x+w+10)])
        center_mean = np.mean(gray[ry1:ry2, rx1:rx2])
        if abs(center_mean - local_mean) > 15:
            conf += 0.05

        conf = min(conf, 0.98)

        if conf < 0.35:
            continue

        # Classify spot type
        spot_type = _classify_spot(h_mean, s_mean, v_mean, a_mean, dark_ratio, red_ratio)

        # Expand bbox
        pad = max(3, int(min(w, h) * 0.3))
        bx1 = max(0, x - pad)
        by1 = max(0, y - pad)
        bx2 = min(image.shape[1], x + w + pad)
        by2 = min(image.shape[0], y + h + pad)

        detections.append({
            "bbox": [int(bx1), int(by1), int(bx2), int(by2)],
            "confidence": round(float(conf), 4),
            "class": "acne",
            "type": spot_type,
        })

    return detections


def _classify_spot(h, s, v, a, dark_ratio, red_ratio) -> str:
    """Classify acne type based on color features."""
    if dark_ratio > 0.3 and v < 100:
        return "blackhead"
    if red_ratio > 0.2 and a > 140:
        return "papule"
    if v > 200 and s < 35:
        return "whitehead"
    if 15 < h < 35 and s > 50:
        return "pustule"
    if red_ratio > 0.1:
        return "inflammatory"
    return "comedone"


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
        result.append({
            "bbox": merged_box,
            "confidence": float(cluster_scores.max()),
            "class_name": "acne",
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
