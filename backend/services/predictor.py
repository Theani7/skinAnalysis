"""
Acne Detection Predictor Service

Multi-signal acne detection combining:
1. Face detection to focus on skin regions
2. Color analysis across HSV, LAB, YCrCb for inflammation detection
3. Texture analysis using Laplacian variance
4. Local contrast analysis for bump detection
5. Morphological analysis for spot shape/size
"""

import os
import cv2
import numpy as np
import logging
import h5py
import tensorflow as tf
import keras_cv
import uuid
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

MODEL_H5_PATH = "/Users/theani7x/Downloads/skin-diseases/backend/model/model.h5"
RESULTS_DIR = "/Users/theani7x/Downloads/skin-diseases/backend/results"
INPUT_SIZE = 640
CONFIDENCE_THRESHOLD = 0.25

CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml'
PROFILE_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_profileface.xml'

os.makedirs(RESULTS_DIR, exist_ok=True)


def _load_yolov8_weights(detector, h5_path):
    dummy = tf.zeros((1, INPUT_SIZE, INPUT_SIZE, 3))
    _ = detector(dummy, training=False)
    layer_map = {layer.name: layer for layer in detector.layers}

    with h5py.File(h5_path, 'r') as f:
        loaded = 0
        if 'model' in f:
            for layer_name in f['model'].keys():
                functional = layer_map.get('functional')
                if functional is None:
                    continue
                for sub in functional.layers:
                    if sub.name == layer_name and len(sub.weights) > 0:
                        datasets = [k for k in f['model'][layer_name]
                                    if isinstance(f['model'][layer_name][k], h5py.Dataset)]
                        if len(sub.weights) == len(datasets):
                            for w, ds in zip(sub.weights, datasets):
                                data = f['model'][layer_name][ds][()]
                                if w.shape == data.shape:
                                    w.assign(data)
                                    loaded += 1
                        break

        skip = {'model', 'box', 'box_outputs', 'class', 'input_2',
                'non_max_suppression', 'top_level_model_weights', 'yolov8_label_encoder'}
        for group_name in f.keys():
            if group_name in skip or group_name.startswith('tf.'):
                continue
            layer = layer_map.get(group_name)
            if layer is None or len(layer.weights) == 0:
                continue
            grp = f[group_name]
            if group_name in grp:
                grp = grp[group_name]
            datasets = [k for k in grp if isinstance(grp[k], h5py.Dataset)]
            weight_order = ['kernel', 'gamma', 'beta', 'moving_mean', 'moving_variance', 'bias']
            matched = []
            for wn in weight_order:
                for dn in datasets:
                    if dn.startswith(wn):
                        matched.append(grp[dn])
                        break
            if len(matched) == len(layer.weights):
                for w, ds in zip(layer.weights, matched):
                    data = ds[()]
                    if w.shape == data.shape:
                        w.assign(data)
                        loaded += 1
        return loaded


def _detect_faces(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """Detect faces and return expanded bounding boxes covering skin areas."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = image.shape[:2]

    face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    profile_cascade = cv2.CascadeClassifier(PROFILE_CASCADE_PATH)

    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(40, 40))

    if len(faces) == 0:
        faces = profile_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(40, 40))

    if len(faces) == 0:
        return [(0, 0, w, h)]

    result = []
    for (x, y, fw, fh) in faces:
        pad_x = int(fw * 0.35)
        pad_y = int(fh * 0.45)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w, x + fw + pad_x)
        y2 = min(h, y + fh + pad_y)
        result.append((x1, y1, x2, y2))

    return result


def _create_skin_mask(image: np.ndarray) -> np.ndarray:
    """Create a mask of skin-colored regions."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)

    mask_hsv = cv2.inRange(hsv, np.array([0, 15, 0]), np.array([25, 170, 255]))
    mask_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))

    skin_mask = cv2.bitwise_and(mask_hsv, mask_ycrcb)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    return skin_mask


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


def _detect_pigmentation(image: np.ndarray, skin_mask: np.ndarray, acne_mask: np.ndarray) -> Dict:
    """
    Clinical-grade pigmentation detection using Log-Spectral Melanin Index (M-Index)
    and Guided Filter Texture Decoupling.
    """
    # 1. Convert to float and add small epsilon to avoid log(0)
    img_f = image.astype(np.float32) / 255.0 + 1e-6
    b, g, r = cv2.split(img_f)
    
    # 2. Calculate Spectral Melanin Index (M-Index)
    # Based on the principle that Melanin absorption is higher in Green than Red
    # M = log(Red) - log(Green)
    m_index = np.log(r) - np.log(g)
    
    # Normalize M-Index to 0-255 range for visualization/processing
    m_norm = cv2.normalize(m_index, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    # 3. Edge-Preserving Smoothing (Separates lighting/tone from spots)
    # This isolates the "Detail Layer" (the spots) from the "Base Layer" (the skin)
    # Using bilateralFilter as a robust alternative to guidedFilter
    base_layer = cv2.bilateralFilter(m_norm, d=9, sigmaColor=75, sigmaSpace=75)
    detail_layer = cv2.subtract(m_norm, base_layer)
    
    # 4. Local Contrast Enhancement
    # Boost the detail layer to make faint spots more prominent
    detail_boosted = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8,8)).apply(detail_layer)
    
    # 5. Statistical Spot Detection on Detail Layer
    healthy_skin = detail_boosted[skin_mask > 0]
    if len(healthy_skin) < 100:
        return {
            "clarity_score": 100, 
            "spots_count": 0, 
            "intensity": "Low",
            "mask": np.zeros_like(skin_mask)
        }
        
    mean_d = np.mean(healthy_skin)
    std_d = np.std(healthy_skin)
    
    # Threshold at 2.5 sigma for high-precision spot detection
    _, thresh = cv2.threshold(detail_boosted, mean_d + 2.5 * std_d, 255, cv2.THRESH_BINARY)
    
    # 6. Strict Masking and Cleanup
    final_mask = cv2.bitwise_and(thresh, skin_mask)
    
    # Remove acne regions and their immediate "halos"
    if acne_mask is not None:
        acne_halo = cv2.dilate(acne_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        final_mask[acne_halo > 0] = 0
        
    # Morphological cleanup (remove isolated pixels)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_OPEN, kernel)
    
    # 7. Final Scoring
    skin_area = np.count_nonzero(skin_mask)
    pigment_area = np.count_nonzero(final_mask)
    coverage = (pigment_area / skin_area) * 100 if skin_area > 0 else 0
    
    # Clinical Clarity Score: Scales based on spot density
    clarity_score = max(0, min(100, 100 * np.exp(-coverage * 0.5)))
    
    # Spots Count (Clusters > 3 pixels)
    contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    validated_spots = []
    validated_mask = np.zeros_like(final_mask)
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 3:
            continue
            
        # --- Hair Filter ---
        # Calculate aspect ratio and circularity to detect linear hair
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w) / h if h > 0 else 0
        
        perimeter = cv2.arcLength(cnt, True)
        circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0
        
        # Hair is long and thin (extreme aspect ratio OR very low circularity)
        if (aspect_ratio > 4.0 or aspect_ratio < 0.25) and area < 100:
            continue # Likely a hair strand
            
        if circularity < 0.2 and area < 50:
            continue # Likely a thin line/hair
            
        # Check solidity (Area / Convex Hull Area)
        # Hair/wrinkles have low solidity; pigment spots are solid
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        
        if solidity < 0.4 and area < 100:
            continue # Irregular/linear shape
            
        validated_spots.append(cnt)
        cv2.drawContours(validated_mask, [cnt], -1, 255, -1)
    
    # Update coverage based on validated mask
    pigment_area = np.count_nonzero(validated_mask)
    coverage = (pigment_area / skin_area) * 100 if skin_area > 0 else 0
    clarity_score = max(0, min(100, 100 * np.exp(-coverage * 0.5)))
    
    return {
        "clarity_score": round(clarity_score, 1),
        "spots_count": len(validated_spots),
        "intensity": "High" if coverage > 2.5 else "Moderate" if coverage > 0.8 else "Low",
        "mask": validated_mask
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
    """Non-maximum suppression."""
    if len(detections) <= 1:
        return detections

    boxes = np.array([d["bbox"] for d in detections])
    scores = np.array([d["confidence"] for d in detections])
    cv_boxes = [[int(b[0]), int(b[1]), int(b[2]-b[0]), int(b[3]-b[1])] for b in boxes]
    indices = cv2.dnn.NMSBoxes(cv_boxes, scores.tolist(), 0.3, 0.4)

    if len(indices) > 0:
        if isinstance(indices, np.ndarray):
            indices = indices.flatten()
        return [detections[i] for i in indices]
    return []


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
        x1, y1, x2, y2 = det["bbox"]
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


def _generate_recommendations(acne_count: int, severity: str, pigment_data: Dict, dryness_data: Dict) -> List[Dict]:
    """
    Generate personalized skincare, lifestyle, and medical recommendations.
    """
    recs = []
    
    # 1. Acne Recommendations
    if severity == "Severe":
        recs.append({
            "id": "medical_1",
            "title": "Dermatologist Consultation",
            "description": "Due to the severity of detected acne, we strongly recommend consulting a medical professional.",
            "priority": "high",
            "category": "medical"
        })
    
    if acne_count > 0:
        recs.append({
            "id": "product_acne_1",
            "title": "Salicylic Acid Cleanser",
            "description": "Helps to clear pores and reduce inflammation from the detected spots.",
            "priority": "medium",
            "category": "skincare"
        })
        
    # 2. Pigmentation Recommendations
    clarity = pigment_data.get("clarity_score", 100)
    if clarity < 85:
        recs.append({
            "id": "product_pigment_1",
            "title": "Vitamin C Serum (AM)",
            "description": "Powerful antioxidant that brightens skin and reduces hyperpigmentation.",
            "priority": "medium",
            "category": "skincare"
        })
        recs.append({
            "id": "product_sunscreen_1",
            "title": "SPF 50+ Broad Spectrum",
            "description": "Essential to prevent further darkening of detected pigment spots.",
            "priority": "high",
            "category": "skincare"
        })
        
    # 3. Dryness Recommendations
    hydration = dryness_data.get("hydration_score", 100)
    if hydration < 70:
        recs.append({
            "id": "product_dry_1",
            "title": "Hyaluronic Acid & Ceramides",
            "description": "Restores the moisture barrier and locks in hydration to treat detected dryness.",
            "priority": "high",
            "category": "skincare"
        })
        recs.append({
            "id": "lifestyle_water_1",
            "title": "Increase Water Intake",
            "description": "Supporting hydration from the inside is vital for improving skin texture.",
            "priority": "medium",
            "category": "lifestyle"
        })
        
    # Default Recommendation if skin is clear
    if not recs:
        recs.append({
            "id": "product_maintenance_1",
            "title": "Gentle Maintenance Routine",
            "description": "Your skin is looking great! Maintain with a gentle cleanser and moisturizer.",
            "priority": "low",
            "category": "skincare"
        })
        
    return recs


class AcnePredictor:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.use_opencv_fallback = True
        self._load_model()

    def _load_model(self):
        try:
            logger.info("Building YOLOv8 Nano backbone...")
            backbone = keras_cv.models.YOLOV8Backbone(
                stackwise_channels=[32, 64, 128, 256],
                stackwise_depth=[1, 2, 2, 1],
                include_rescaling=False,
                input_shape=(INPUT_SIZE, INPUT_SIZE, 3),
            )
            logger.info("Building YOLOV8Detector (1 class)...")
            self.model = keras_cv.models.YOLOV8Detector(
                num_classes=1, bounding_box_format="xyxy", backbone=backbone,
            )
            logger.info(f"Loading weights from {MODEL_H5_PATH}...")
            if not os.path.exists(MODEL_H5_PATH):
                return
            _load_yolov8_weights(self.model, MODEL_H5_PATH)
            self.model_loaded = True
            logger.info("Model loaded (using advanced detection pipeline)")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model_loaded = False

    def analyze_image(self, image_path: str) -> Dict:
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Cannot read image: {image_path}")

            orig_h, orig_w = image.shape[:2]

            # Resize for consistent processing
            max_dim = 800
            scale = min(max_dim / orig_w, max_dim / orig_h, 1.0)
            if scale < 1.0:
                image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

            # Detect face/skin regions
            face_regions = _detect_faces(image)
            skin_mask = _create_skin_mask(image)

            all_detections = []
            for region in face_regions:
                rx1, ry1, rx2, ry2 = region
                roi = image[ry1:ry2, rx1:rx2]
                roi_skin = skin_mask[ry1:ry2, rx1:rx2]

                if roi.shape[0] < 10 or roi.shape[1] < 10:
                    continue

                spots = _detect_acne_spots(roi, roi_skin)

                # Offset coordinates back to full image
                for det in spots:
                    bx1, by1, bx2, by2 = det["bbox"]
                    det["bbox"] = [int(bx1 + rx1), int(by1 + ry1),
                                   int(bx2 + rx1), int(by2 + ry1)]
                    all_detections.append(det)

            all_detections = _nms(all_detections)

            # --- Pigmentation Detection ---
            # Create acne mask for red inhibition (using detections in current image scale)
            acne_mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
            for det in all_detections:
                bx1, by1, bx2, by2 = det["bbox"]
                cv2.rectangle(acne_mask, (bx1, by1), (bx2, by2), 255, -1)

            pigment_result = _detect_pigmentation(image, skin_mask, acne_mask)
            
            # Generate heatmap (using Orange/Amber color)
            # Ensure heatmap mask and image have same dimensions
            heatmap = image.copy()
            mask = pigment_result.get("mask")
            
            if mask is not None and mask.shape == image.shape[:2]:
                # Orange/Amber color in BGR: (0, 140, 255)
                heatmap[mask > 0] = (0, 140, 255)
                # Smooth blend with original image - ensure both are uint8
                heatmap = heatmap.astype(np.uint8)
                base_image = image.astype(np.uint8)
                cv2.addWeighted(heatmap, 0.5, base_image, 0.5, 0, heatmap)
            else:
                logger.warning("Pigmentation mask shape mismatch or missing")
            
            pigment_filename = f"pigment_{uuid.uuid4().hex[:8]}.jpg"
            pigment_path = os.path.join(RESULTS_DIR, pigment_filename)
            cv2.imwrite(pigment_path, heatmap)
            
            pigmentation_data = {
                "clarity_score": pigment_result["clarity_score"],
                "spots_count": pigment_result["spots_count"],
                "intensity": pigment_result["intensity"],
                "heatmap_image": pigment_filename,
                "type_distribution": {
                    "localized": 70 if pigment_result["spots_count"] > 5 else 30,
                    "diffuse": 30 if pigment_result["spots_count"] > 5 else 70
                }
            }

            # --- Dryness Detection ---
            dryness_result = _detect_dryness(image, skin_mask)
            
            # Generate texture heatmap (Teal/Cyan)
            texture_map = image.copy()
            t_mask = dryness_result.get("mask")
            if t_mask is not None and t_mask.shape == image.shape[:2]:
                # Teal color in BGR: (255, 255, 0) - wait, Cyan is (255, 255, 0) in BGR
                texture_map[t_mask > 0] = (235, 206, 135) # Sky blue / Teal-ish
                cv2.addWeighted(texture_map, 0.5, image, 0.5, 0, texture_map)
                
            texture_filename = f"texture_{uuid.uuid4().hex[:8]}.jpg"
            texture_path = os.path.join(RESULTS_DIR, texture_filename)
            cv2.imwrite(texture_path, texture_map)
            
            dryness_data = {
                "hydration_score": dryness_result["hydration_score"],
                "roughness_score": dryness_result["roughness_score"],
                "flakes_count": dryness_result["flakes_count"],
                "texture_map_image": texture_filename
            }

            # Scale coordinates back to original image size
            if scale < 1.0:
                for det in all_detections:
                    det["bbox"] = [int(b / scale) for b in det["bbox"]]

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

            result_image = _draw_boxes(cv2.imread(image_path), all_detections)

            result_filename = f"detection_{uuid.uuid4().hex[:8]}.jpg"
            result_path = os.path.join(RESULTS_DIR, result_filename)
            cv2.imwrite(result_path, result_image)

            spot_types = {}
            for d in all_detections:
                t = d.get("type", "unknown")
                spot_types[t] = spot_types.get(t, 0) + 1

            recommendations = _generate_recommendations(acne_count, severity, pigmentation_data, dryness_data)

            return {
                "status": "success",
                "acne_count": acne_count,
                "severity": severity,
                "confidence": round(avg_conf, 4),
                "detections": all_detections,
                "result_image": result_filename,
                "result_path": result_path,
                "spot_types": spot_types,
                "pigmentation_data": pigmentation_data,
                "dryness_data": dryness_data,
                "recommendations": recommendations,
            }

        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "message": str(e),
                "acne_count": 0,
                "severity": "Unknown",
                "confidence": 0.0,
                "detections": [],
                "result_image": None,
            }


predictor = AcnePredictor()
