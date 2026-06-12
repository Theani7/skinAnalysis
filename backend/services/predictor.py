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
import uuid
from typing import Dict, List, Tuple

import cv2
import h5py
import keras_cv
import numpy as np
import tensorflow as tf
from ultralytics import YOLO

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_H5_PATH = os.path.join(BACKEND_DIR, "model", "model.h5")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
INPUT_SIZE = 640

YOLO_FACE_MODEL_PATH = os.path.join(MODELS_DIR, "YOLO-face.pt")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)


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


def _detect_faces_yolo(image: np.ndarray, model: YOLO) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces using YOLOv8 (arnabdhar/YOLOv8-Face-Detection).
    Returns list of (x1, y1, x2, y2) bounding boxes with padding for skin context.
    """
    h, w = image.shape[:2]
    results = model(image, verbose=False)

    faces = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            conf = float(box.conf[0])
            if conf < 0.4:
                continue
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            # Pad bounding box slightly for skin context
            fw, fh = x2 - x1, y2 - y1
            pad_x = int(fw * 0.05)
            pad_y = int(fh * 0.05)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)
            faces.append((x1, y1, x2, y2))

    return faces


def _estimate_face_from_skin(skin_mask: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Fallback: estimate face location from the largest skin-colored blob.
    Assumes the face is the largest connected skin region in the upper-center area.
    """
    h, w = skin_mask.shape

    # Focus on upper 70% of image (faces are rarely at the very bottom)
    upper_mask = np.zeros_like(skin_mask)
    upper_h = int(h * 0.7)
    upper_mask[:upper_h, :] = skin_mask[:upper_h, :]

    # Focus on center 80% horizontally (faces are usually centered)
    center_mask = np.zeros_like(upper_mask)
    margin_x = int(w * 0.1)
    center_mask[:, margin_x:w - margin_x] = upper_mask[:, margin_x:w - margin_x]

    # Find connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(center_mask, connectivity=8)

    if num_labels <= 1:
        return []

    # Find the largest component (skip label 0 = background)
    best_label = -1
    best_area = 0
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        cx, cy = centroids[i]
        # Prefer components that are in the upper-center (face-like position)
        vertical_score = 1.0 - (cy / h)  # higher = more upper
        horizontal_center = abs(cx - w / 2) / (w / 2)  # 0 = center, 1 = edge
        center_score = 1.0 - horizontal_center

        # Combined score: size + position bias
        score = area * (0.7 + 0.3 * vertical_score * center_score)

        if score > best_area and area > 500:  # minimum 500 pixels
            best_area = score
            best_label = i

    if best_label < 0:
        return []

    # Get bounding box of the largest skin component
    x = stats[best_label, cv2.CC_STAT_LEFT]
    y = stats[best_label, cv2.CC_STAT_TOP]
    bw = stats[best_label, cv2.CC_STAT_WIDTH]
    bh = stats[best_label, cv2.CC_STAT_HEIGHT]

    # Expand slightly for face context
    pad_x = int(bw * 0.15)
    pad_y = int(bh * 0.15)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + bw + pad_x)
    y2 = min(h, y + bh + pad_y)

    return [(x1, y1, x2, y2)]


def _assess_face_quality(image: np.ndarray, face_box: Tuple[int, int, int, int]) -> Dict:
    """Assess face quality metrics: blur, angle, size, lighting."""
    x1, y1, x2, y2 = face_box
    face_roi = image[y1:y2, x1:x2]

    if face_roi.size == 0:
        return {"blur_score": 0, "angle_score": 0, "size_score": 0, "lighting_score": 0, "overall": 0}

    gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # 1. Blur score (Laplacian variance — higher = sharper)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(100, (laplacian_var / 500) * 100)

    # 2. Angle score (aspect ratio deviation from expected ~0.75)
    aspect_ratio = w / h if h > 0 else 0
    angle_score = max(0, 100 - abs(aspect_ratio - 0.75) * 200)

    # 3. Size score (face should occupy 30-70% of image)
    img_area = image.shape[0] * image.shape[1]
    face_area = w * h
    size_ratio = face_area / img_area if img_area > 0 else 0
    if 0.05 < size_ratio < 0.5:
        size_score = 100
    elif size_ratio <= 0.05:
        size_score = (size_ratio / 0.05) * 100
    else:
        size_score = max(0, 100 - (size_ratio - 0.5) * 200)

    # 4. Lighting score (mean luminance should be 60-180)
    mean_lum = np.mean(gray)
    if 60 <= mean_lum <= 180:
        lighting_score = 100
    elif mean_lum < 60:
        lighting_score = (mean_lum / 60) * 100
    else:
        lighting_score = max(0, 100 - (mean_lum - 180) * 0.625)

    overall = (blur_score * 0.35 + angle_score * 0.2 + size_score * 0.2 + lighting_score * 0.25)

    return {
        "blur_score": round(blur_score, 1),
        "angle_score": round(angle_score, 1),
        "size_score": round(size_score, 1),
        "lighting_score": round(lighting_score, 1),
        "overall": round(overall, 1),
    }


def _get_face_landmarks_region(image: np.ndarray, face_box: Tuple[int, int, int, int]) -> Dict[str, Tuple[int, int, int, int]]:
    """Estimate facial regions (forehead, T-zone, cheeks, chin) from face bounding box."""
    x1, y1, x2, y2 = face_box
    fw = x2 - x1
    fh = y2 - y1
    img_h, img_w = image.shape[:2]

    # Define proportional regions within the face box
    regions = {
        "forehead": (
            max(0, x1 + int(fw * 0.15)),
            max(0, y1),
            min(img_w, x2 - int(fw * 0.15)),
            min(img_h, y1 + int(fh * 0.3))
        ),
        "t_zone": (
            max(0, x1 + int(fw * 0.3)),
            max(0, y1 + int(fh * 0.2)),
            min(img_w, x2 - int(fw * 0.3)),
            min(img_h, y1 + int(fh * 0.65))
        ),
        "left_cheek": (
            max(0, x1),
            max(0, y1 + int(fh * 0.3)),
            min(img_w, x1 + int(fw * 0.4)),
            min(img_h, y1 + int(fh * 0.7))
        ),
        "right_cheek": (
            max(0, x2 - int(fw * 0.4)),
            max(0, y1 + int(fh * 0.3)),
            min(img_w, x2),
            min(img_h, y1 + int(fh * 0.7))
        ),
        "chin": (
            max(0, x1 + int(fw * 0.2)),
            max(0, y1 + int(fh * 0.7)),
            min(img_w, x2 - int(fw * 0.2)),
            min(img_h, y2)
        ),
    }

    return regions


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


def _create_face_mask(image: np.ndarray, face_regions: List[Tuple[int, int, int, int]]) -> np.ndarray:
    """
    Create a precise face-only mask using elliptical face approximation.

    Faces are roughly elliptical, not rectangular. An ellipse naturally excludes:
    - Hair at top corners
    - Ears at the sides
    - Background at corners
    - Neck at the bottom

    The ellipse is further refined by skin-color detection within it,
    so only actual skin pixels are included.
    """
    h, w = image.shape[:2]
    face_mask = np.zeros((h, w), dtype=np.uint8)

    if not face_regions:
        return face_mask

    # Convert to HSV for skin-color refinement
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)

    for (x1, y1, x2, y2) in face_regions:
        fw = x2 - x1
        fh = y2 - y1
        if fw < 10 or fh < 10:
            continue

        # Face center and radii
        cx = x1 + fw // 2
        cy = y1 + fh // 2
        # Ellipse slightly smaller than bounding box to exclude edges
        rx = int(fw * 0.45)  # 90% of half-width
        ry = int(fh * 0.48)  # 96% of half-height

        # Create elliptical mask
        ellipse_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(ellipse_mask, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)

        # Refine with skin color inside the ellipse
        skin_hsv = cv2.inRange(hsv, np.array([0, 15, 0]), np.array([25, 170, 255]))
        skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_color = cv2.bitwise_and(skin_hsv, skin_ycrcb)

        # Combine: must be inside ellipse AND have skin color
        refined = cv2.bitwise_and(ellipse_mask, skin_color)

        # Morphological cleanup to fill small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel, iterations=2)
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel, iterations=1)

        face_mask = cv2.bitwise_or(face_mask, refined)

    return face_mask


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
    Multi-spectral pigmentation detection using three independent color channels:
    1. Log-Spectral Melanin Index (M-Index) — melanin concentration
    2. LAB a* channel — redness/hemoglobin (post-inflammatory pigmentation)
    3. HSV V channel — dark spot detection

    Each channel runs multi-scale detection with adaptive Otsu thresholding,
    and results are fused via majority voting to reduce false positives.
    """
    skin_area = np.count_nonzero(skin_mask)
    if skin_area < 100:
        return {
            "clarity_score": 100,
            "spots_count": 0,
            "intensity": "Low",
            "mask": np.zeros_like(skin_mask),
            "intensity_map": np.zeros_like(skin_mask, dtype=np.float32),
        }

    # ── Channel 1: Log-Spectral Melanin Index (M-Index) ──
    img_f = image.astype(np.float32) / 255.0 + 1e-6
    b, g, r = cv2.split(img_f)
    m_index = np.log(r) - np.log(g)
    m_norm = cv2.normalize(m_index, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # ── Channel 2: LAB a* (redness — captures melasma & post-inflammatory marks) ──
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    a_channel = lab[:, :, 1]  # a* range ~0-255 in OpenCV (128 = neutral)

    # ── Channel 3: HSV Value (dark spot detection) ──
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    # Invert: dark spots become bright for detection
    v_inv = cv2.bitwise_not(v_channel)

    def _extract_detail(channel: np.ndarray) -> np.ndarray:
        """Bilateral filter → detail layer → CLAHE enhancement."""
        base = cv2.bilateralFilter(channel, d=9, sigmaColor=75, sigmaSpace=75)
        detail = cv2.subtract(channel, base)
        return cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8)).apply(detail)

    def _multi_scale_detect(detail: np.ndarray, skin_roi: np.ndarray) -> np.ndarray:
        """Run Otsu threshold at 3 scales and merge via union."""
        merged = np.zeros_like(detail)
        for ksize in [3, 5, 9]:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
            smoothed = cv2.morphologyEx(detail, cv2.MORPH_CLOSE, kernel)

            # Adaptive Otsu — works across skin tones
            skin_vals = smoothed[skin_roi > 0]
            if len(skin_vals) < 50:
                continue
            otsu_thresh, _ = cv2.threshold(skin_vals, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            # Use the Otsu threshold as a floor, also keep sigma-based for comparison
            mean_d = np.mean(skin_vals)
            std_d = np.std(skin_vals)
            sigma_thresh_val = mean_d + 2.0 * std_d  # slightly relaxed from 2.5

            # Take the lower of Otsu and sigma (more sensitive), but at least mean + 1σ
            effective_thresh = max(sigma_thresh_val, otsu_thresh * 0.7)
            _, binary = cv2.threshold(smoothed, effective_thresh, 255, cv2.THRESH_BINARY)
            merged = cv2.bitwise_or(merged, binary)
        return merged

    # Process each channel
    m_detail = _extract_detail(m_norm)
    m_spots = _multi_scale_detect(m_detail, skin_mask)

    a_detail = _extract_detail(a_channel)
    a_spots = _multi_scale_detect(a_detail, skin_mask)

    v_detail = _extract_detail(v_inv)
    v_spots = _multi_scale_detect(v_detail, skin_mask)

    # ── Multi-channel voting: pixel must appear in >= 2 of 3 channels ──
    vote_sum = cv2.add(
        cv2.add(m_spots // 128, a_spots // 128),
        v_spots // 128,
    )
    fused_mask = np.where(vote_sum >= 2, 255, 0).astype(np.uint8)

    # ── Masking & cleanup ──
    fused_mask = cv2.bitwise_and(fused_mask, skin_mask)

    # Remove acne regions and halos
    if acne_mask is not None:
        acne_halo = cv2.dilate(acne_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        fused_mask[acne_halo > 0] = 0

    kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    fused_mask = cv2.morphologyEx(fused_mask, cv2.MORPH_OPEN, kernel_clean)

    # ── Build intensity map for heatmap (0.0–1.0 float) ──
    # Combine raw channel strengths for a continuous intensity signal
    m_float = cv2.normalize(m_detail, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
    a_float = cv2.normalize(a_detail, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
    v_float = cv2.normalize(v_detail, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
    intensity_map = (m_float * 0.4 + a_float * 0.35 + v_float * 0.25)
    # Zero out non-skin and non-spot regions
    intensity_map = np.where(fused_mask > 0, intensity_map, 0.0)

    # ── Spot validation with improved hair filter ──
    contours, _ = cv2.findContours(fused_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    validated_spots = []
    validated_mask = np.zeros_like(fused_mask)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 3:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w) / h if h > 0 else 0

        perimeter = cv2.arcLength(cnt, True)
        circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0

        # Perimeter-to-area irregularity: hair/wrinkles have high perimeter relative to area
        irregularity = perimeter / (2.0 * np.sqrt(np.pi * area)) if area > 0 else 0

        # ── Hair/line rejection ──
        # Extreme aspect ratio + small area = likely hair
        if (aspect_ratio > 4.0 or aspect_ratio < 0.25) and area < 100:
            continue
        # Very elongated with high irregularity
        if irregularity > 4.0 and area < 80:
            continue
        # Low circularity + small = thin line
        if circularity < 0.15 and area < 50:
            continue

        # ── Solidity filter ──
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        if solidity < 0.35 and area < 100:
            continue

        validated_spots.append(cnt)
        cv2.drawContours(validated_mask, [cnt], -1, 255, -1)

    # Update intensity map to validated spots only
    intensity_map = np.where(validated_mask > 0, intensity_map, 0.0)

    # ── Scoring ──
    pigment_area = np.count_nonzero(validated_mask)
    coverage = (pigment_area / skin_area) * 100 if skin_area > 0 else 0

    # Exponential decay clarity score
    clarity_score = max(0, min(100, 100 * np.exp(-coverage * 0.5)))

    # Intensity classification with stricter thresholds (multi-channel = more confident)
    if coverage > 3.0:
        intensity = "High"
    elif coverage > 1.0:
        intensity = "Moderate"
    else:
        intensity = "Low"

    return {
        "clarity_score": round(clarity_score, 1),
        "spots_count": len(validated_spots),
        "intensity": intensity,
        "mask": validated_mask,
        "intensity_map": intensity_map,
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


def _generate_recommendations(acne_count: int, severity: str, pigment_data: Dict, dryness_data: Dict, spot_types: Dict = None) -> Dict:
    """
    Generate personalized skincare, lifestyle, and medical recommendations.
    Returns both a flat list and a structured AM/PM routine.
    """
    recs = []
    conflicts = []
    clarity = pigment_data.get("clarity_score", 100)
    hydration = dryness_data.get("hydration_score", 100)
    roughness = dryness_data.get("roughness_score", 0)
    flakes = dryness_data.get("flakes_count", 0)
    pigment_intensity = pigment_data.get("intensity", "Low")
    types = spot_types or {}

    has_dryness = hydration < 70
    has_acne = acne_count > 0
    has_pigmentation = clarity < 85

    # ── Conflict Detection ──
    if has_dryness and has_acne:
        conflicts.append({
            "message": "Your skin shows both dryness and acne. Avoid over-exfoliating — use gentle actives only.",
            "severity": "warning"
        })

    # ── ACNE RECOMMENDATIONS ──
    if severity == "Severe":
        recs.append({
            "id": "med_derma",
            "title": "Dermatologist Consultation",
            "description": "Severe acne detected across multiple facial zones. Professional extraction and prescription-strength treatment (isotretinoin, antibiotics) may be necessary.",
            "priority": "high",
            "category": "medical",
            "why": f"Detected {acne_count} active lesions across the face.",
            "conflictsWith": []
        })

    if types.get("inflammatory", 0) > 0 or types.get("papule", 0) > 0:
        recs.append({
            "id": "acne_bpo",
            "title": "Benzoyl Peroxide 2.5%",
            "description": "Apply a thin layer to affected areas after cleansing in the evening. Kills acne-causing bacteria and reduces inflammation. Start with 2.5% to minimize irritation.",
            "priority": "high" if acne_count > 10 else "medium",
            "category": "skincare",
            "why": f"Detected {types.get('inflammatory', 0) + types.get('papule', 0)} inflamed/inflammatory lesions.",
            "conflictsWith": ["retinol"]
        })

    if types.get("blackhead", 0) > 0:
        recs.append({
            "id": "acne_bha",
            "title": "Salicylic Acid 2% BHA",
            "description": "Oil-soluble exfoliant that penetrates deep into pores to dissolve blackhead-causing sebum. Use 2-3 times per week in the evening.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('blackhead', 0)} blackhead(s) — BHA targets clogged pores.",
            "conflictsWith": ["aha_lactic"]
        })

    if types.get("whitehead", 0) > 0:
        recs.append({
            "id": "acne_adapalene",
            "title": "Adapalene 0.1% (Differin)",
            "description": "Topical retinoid that normalizes skin cell turnover to prevent pore clogging. Apply a pea-sized amount to entire face at night. Expect mild peeling for 2-4 weeks.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('whitehead', 0)} whitehead(s) — adapalene prevents comedone formation.",
            "conflictsWith": ["benzoyl_peroxide", "aha_lactic"]
        })

    if types.get("pustule", 0) > 0:
        recs.append({
            "id": "acne_niacinamide",
            "title": "Niacinamide 10% Serum",
            "description": "Regulates sebum production and reduces the redness associated with pustules. Apply after cleansing, before moisturizer. Gentle enough for daily use.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Detected {types.get('pustule', 0)} pustule(s) — niacinamide controls oil and calms inflammation.",
            "conflictsWith": []
        })

    if has_acne and acne_count <= 5:
        recs.append({
            "id": "acne_teatree",
            "title": "Tea Tree Oil Spot Treatment",
            "description": "Apply directly to individual spots using a cotton swab. Natural antibacterial that reduces mild blemishes without drying the surrounding skin.",
            "priority": "low",
            "category": "skincare",
            "why": "Mild acne — spot treatment is sufficient.",
            "conflictsWith": []
        })

    # ── PIGMENTATION RECOMMENDATIONS ──
    if clarity < 70:
        recs.append({
            "id": "pig_retinol",
            "title": "Retinol 0.5% (PM)",
            "description": "Accelerates cell turnover to fade dark spots and even skin tone. Start with 0.3% if new to retinol. Apply 2-3 nights per week, gradually increasing. Always pair with sunscreen.",
            "priority": "high",
            "category": "skincare",
            "why": f"Pigmentation clarity is low ({clarity}%) — retinol promotes skin renewal.",
            "conflictsWith": ["benzoyl_peroxide", "aha_lactic", "bha"]
        })

    if clarity < 85:
        recs.append({
            "id": "pig_vitc",
            "title": "Vitamin C 15-20% Serum (AM)",
            "description": "Powerful antioxidant that inhibits melanin production and brightens existing hyperpigmentation. Apply to clean skin in the morning before sunscreen.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Pigmentation clarity at {clarity}% — Vitamin C brightens and protects.",
            "conflictsWith": ["retinol"]
        })
        recs.append({
            "id": "pig_alpha_arbutin",
            "title": "Alpha Arbutin 2% Serum",
            "description": "Gentle melanin inhibitor that fades dark spots without irritation. Can be layered with Vitamin C in the morning or used alone.",
            "priority": "medium",
            "category": "skincare",
            "why": "Supplement to Vitamin C for targeted spot fading.",
            "conflictsWith": []
        })

    if pigment_intensity in ["High", "Moderate"]:
        recs.append({
            "id": "pig_sunscreen",
            "title": "SPF 50+ Broad Spectrum (AM)",
            "description": "Mineral sunscreen (zinc oxide/titanium dioxide) prevents UV-triggered melanin production that worsens pigmentation. Reapply every 2 hours if outdoors. Non-negotiable with any brightening routine.",
            "priority": "high",
            "category": "skincare",
            "why": f"Pigmentation intensity: {pigment_intensity} — UV exposure will darken existing spots.",
            "conflictsWith": []
        })

    if clarity < 70 and clarity >= 50:
        recs.append({
            "id": "pig_kojic",
            "title": "Kojic Acid Cream",
            "description": "Natural tyrosinase inhibitor derived from mushrooms. Apply to dark spots at night for 4-8 weeks for visible fading.",
            "priority": "medium",
            "category": "skincare",
            "why": "Moderate pigmentation — kojic acid targets specific dark spots.",
            "conflictsWith": ["retinol"]
        })

    # ── DRYNESS / TEXTURE RECOMMENDATIONS ──
    if hydration < 50:
        recs.append({
            "id": "dry_ha_ceramide",
            "title": "Hyaluronic Acid + Ceramide Moisturizer",
            "description": "Hyaluronic acid draws moisture into the skin while ceramides repair the protective barrier. Apply to damp skin to lock in hydration. Use morning and night.",
            "priority": "high",
            "category": "skincare",
            "why": f"Hydration critically low ({hydration}%) — barrier repair is urgent.",
            "conflictsWith": []
        })
        recs.append({
            "id": "dry_water",
            "title": "Increase Water Intake",
            "description": "Drink at least 2-3 liters of water daily. Dehydrated skin produces excess oil to compensate, worsening both dryness and acne.",
            "priority": "high",
            "category": "lifestyle",
            "why": "Internal hydration directly impacts skin barrier function.",
            "conflictsWith": []
        })
    elif hydration < 70:
        recs.append({
            "id": "dry_ha",
            "title": "Hyaluronic Acid Serum",
            "description": "Lightweight humectant that plumps and hydrates without heaviness. Apply to damp skin, layer moisturizer on top.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Hydration at {hydration}% — needs moisture boost.",
            "conflictsWith": []
        })

    if roughness > 8:
        recs.append({
            "id": "dry_urea",
            "title": "Urea 10% Moisturizer",
            "description": "Urea is both a humectant and mild exfoliant that smooths rough, flaky patches while hydrating. Apply to rough areas at night.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Roughness score elevated ({roughness}%) — urea smooths and hydrates simultaneously.",
            "conflictsWith": ["retinol"]
        })
    elif roughness > 5:
        recs.append({
            "id": "dry_aha_lactic",
            "title": "Lactic Acid 5% (Gentle AHA)",
            "description": "Mild chemical exfoliant that removes dead skin cells and improves texture. Use 2 times per week in the evening. Gentler than glycolic acid for dry skin.",
            "priority": "medium",
            "category": "skincare",
            "why": f"Roughness at {roughness}% — gentle exfoliation improves texture.",
            "conflictsWith": ["bha", "retinol", "adapalene"]
        })

    if flakes > 5:
        recs.append({
            "id": "dry_occlusive",
            "title": "Occlusive Barrier Balm",
            "description": "Rich balm (petrolatum, shea butter, squalane) seals in moisture and prevents transepidermal water loss. Apply as the last step in your evening routine over all other products.",
            "priority": "high",
            "category": "skincare",
            "why": f"Detected {flakes} dry flakes — occlusive layer prevents further moisture loss.",
            "conflictsWith": []
        })

    # ── LIFESTYLE RECOMMENDATIONS ──
    if has_acne or has_pigmentation:
        recs.append({
            "id": "life_pillow",
            "title": "Clean Pillowcase Every 2-3 Days",
            "description": "Pillowcases accumulate bacteria, oil, and dead skin that transfer to your face. Use silk or satin to reduce friction and bacterial buildup.",
            "priority": "low",
            "category": "lifestyle",
            "why": "Reducing bacterial transfer helps prevent breakouts and irritation.",
            "conflictsWith": []
        })

    if has_acne:
        recs.append({
            "id": "life_diet",
            "title": "Reduce High-Glycemic Foods & Dairy",
            "description": "Studies link high-glycemic foods (sugar, white bread) and dairy (skim milk) to increased acne. Consider reducing intake for 4-6 weeks to observe changes.",
            "priority": "low",
            "category": "lifestyle",
            "why": "Dietary triggers can exacerbate hormonal acne.",
            "conflictsWith": []
        })

    if severity in ["Severe", "Moderate"] or has_dryness:
        recs.append({
            "id": "life_sleep",
            "title": "Prioritize 7-9 Hours of Sleep",
            "description": "Sleep deprivation increases cortisol, which triggers inflammation and excess oil production. Maintain a consistent sleep schedule for skin repair.",
            "priority": "medium",
            "category": "lifestyle",
            "why": "Skin regenerates during sleep — poor sleep slows healing.",
            "conflictsWith": []
        })

    # ── DEFAULT: Skin is clear ──
    if not recs:
        recs.append({
            "id": "maint_routine",
            "title": "Gentle Maintenance Routine",
            "description": "Your skin analysis looks excellent! Maintain with: gentle cleanser → lightweight moisturizer → SPF 30+ daily. Avoid over-washing or using harsh products.",
            "priority": "low",
            "category": "skincare",
            "why": "No significant concerns detected.",
            "conflictsWith": []
        })

    # ── BUILD AM/PM ROUTINE ──
    routine = _build_routine(recs, has_acne, has_pigmentation, has_dryness)

    return {
        "recommendations": recs,
        "conflicts": conflicts,
        "routine": routine,
    }


def _build_routine(recs: List[Dict], has_acne: bool, has_pigmentation: bool, has_dryness: bool) -> Dict:
    """Structure recommendations into an AM/PM skincare routine."""
    rec_ids = {r["id"] for r in recs}

    morning = []
    evening = []

    # ── MORNING ──
    morning.append({"step": 1, "product": "Gentle Cleanser", "action": "Splash with lukewarm water and cleanse", "id": "cleanse_am"})
    morning.append({"step": 2, "product": "Toner (optional)", "action": "Pat into skin for pH balance", "id": "toner_am"})

    if "pig_vitc" in rec_ids:
        morning.append({"step": 3, "product": "Vitamin C Serum", "action": "Apply 4-5 drops to face and neck, avoid eye area", "id": "pig_vitc"})
        morning.append({"step": 4, "product": "Moisturizer", "action": "Apply to damp skin", "id": "moist_am"})
    elif "dry_ha_ceramide" in rec_ids or "dry_ha" in rec_ids:
        morning.append({"step": 3, "product": "Hyaluronic Acid Serum", "action": "Apply to damp skin, layer moisturizer on top", "id": "dry_ha"})
        morning.append({"step": 4, "product": "Moisturizer", "action": "Apply generously", "id": "moist_am"})
    else:
        morning.append({"step": 3, "product": "Moisturizer", "action": "Apply to face and neck", "id": "moist_am"})

    if "pig_sunscreen" in rec_ids:
        morning.append({"step": 5, "product": "SPF 50+ Sunscreen", "action": "Apply 2 finger-lengths to face. Reapply every 2 hours if outdoors.", "id": "pig_sunscreen"})
    else:
        morning.append({"step": 5, "product": "SPF 30+ Sunscreen", "action": "Apply as the last step before makeup", "id": "spf_maint"})

    # ── EVENING ──
    evening.append({"step": 1, "product": "Oil Cleanser / Micellar Water", "action": "Remove sunscreen and makeup first", "id": "cleanse_prem"})

    if "acne_bha" in rec_ids:
        evening.append({"step": 2, "product": "Salicylic Acid Cleanser", "action": "Massage for 60 seconds, rinse thoroughly", "id": "acne_bha"})
    elif "acne_bpo" in rec_ids:
        evening.append({"step": 2, "product": "Benzoyl Peroxide Wash 2.5%", "action": "Lather, leave on for 2-3 minutes, rinse", "id": "acne_bpo_wash"})
    else:
        evening.append({"step": 2, "product": "Gentle Cleanser", "action": "Double cleanse if wearing makeup/sunscreen", "id": "cleanse_pm"})

    step = 3
    if "acne_adapalene" in rec_ids:
        evening.append({"step": step, "product": "Adapalene 0.1%", "action": "Pea-sized amount for entire face. Avoid eye area. Use every other night initially.", "id": "acne_adapalene"})
        step += 1
    elif "pig_retinol" in rec_ids:
        evening.append({"step": step, "product": "Retinol 0.5%", "action": "Apply pea-sized amount to entire face. Start 2x/week, build up tolerance.", "id": "pig_retinol"})
        step += 1

    if "acne_niacinamide" in rec_ids:
        evening.append({"step": step, "product": "Niacinamide 10% Serum", "action": "Apply a few drops, wait 1 minute before next step", "id": "acne_niacinamide"})
        step += 1

    if "acne_teatree" in rec_ids:
        evening.append({"step": step, "product": "Tea Tree Oil (diluted)", "action": "Dab onto individual spots with cotton swab", "id": "acne_teatree"})
        step += 1

    if "dry_ha_ceramide" in rec_ids or "dry_ha" in rec_ids:
        evening.append({"step": step, "product": "Hyaluronic Acid + Ceramide Moisturizer", "action": "Apply to damp skin as the final layer", "id": "dry_ha_ceramide"})
        step += 1
    else:
        evening.append({"step": step, "product": "Night Moisturizer", "action": "Apply generously, focus on dry areas", "id": "moist_pm"})
        step += 1

    if "dry_occlusive" in rec_ids:
        evening.append({"step": step, "product": "Occlusive Barrier Balm", "action": "Apply thin layer over moisturizer on very dry patches", "id": "dry_occlusive"})
        step += 1

    tips = []
    if "acne_adapalene" in rec_ids and "pig_vitc" in rec_ids:
        tips.append("Use Vitamin C in the morning and Adapalene at night — never mix in the same routine.")
    if "acne_bha" in rec_ids and "pig_retinol" in rec_ids:
        tips.append("Alternate nights: BHA on one night, Retinol on the next. Do not use together.")
    if has_dryness and has_acne:
        tips.append("Your skin is dry AND acne-prone — use gentle, non-stripping cleansers only.")
    if "pig_sunscreen" in rec_ids:
        tips.append("Sunscreen is non-negotiable with any brightening routine. UV exposure reverses progress.")
    tips.append("Introduce new active ingredients one at a time, waiting 2 weeks between each.")
    tips.append("Patch test new products on your jawline for 48 hours before full-face use.")

    return {
        "morning": morning,
        "evening": evening,
        "tips": tips,
    }


class AcnePredictor:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.yolo_face = None
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
                        logger.warning("Skin cluster fallback failed — no reliable face region")
                else:
                    logger.warning("No face detected by YOLO/skin-cluster")

            # Assess face quality for the primary face
            face_quality = None
            if face_regions and face_regions[0] != (0, 0, image.shape[1], image.shape[0]):
                face_quality = _assess_face_quality(image, face_regions[0])

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

            # Generate heatmap using jet colormap with intensity gradient
            heatmap = image.copy().astype(np.uint8)
            intensity_map = pigment_result.get("intensity_map")
            mask = pigment_result.get("mask")

            if mask is not None and intensity_map is not None and mask.shape == image.shape[:2]:
                # Create jet colormap overlay
                jet_colormap = cv2.applyColorMap(
                    (intensity_map * 255).astype(np.uint8), cv2.COLORMAP_JET
                )
                # Only overlay where spots are detected
                spot_pixels = mask > 0
                alpha = 0.55
                heatmap[spot_pixels] = cv2.addWeighted(
                    image[spot_pixels].astype(np.uint8), 1 - alpha,
                    jet_colormap[spot_pixels], alpha, 0,
                ).astype(np.uint8)
            else:
                logger.warning("Pigmentation mask/intensity_map shape mismatch or missing")

            pigment_filename = f"pigment_{uuid.uuid4().hex[:8]}.jpg"
            pigment_path = os.path.join(RESULTS_DIR, pigment_filename)
            # Draw YOLO face box on pigmentation heatmap
            if face_regions:
                for (fx1, fy1, fx2, fy2) in face_regions:
                    color = (255, 180, 0)
                    dash, gap = 12, 8
                    for x in range(fx1, fx2, dash + gap):
                        cv2.line(heatmap, (x, fy1), (min(x + dash, fx2), fy1), color, 2)
                        cv2.line(heatmap, (x, fy2), (min(x + dash, fx2), fy2), color, 2)
                    for y in range(fy1, fy2, dash + gap):
                        cv2.line(heatmap, (fx1, y), (fx1, min(y + dash, fy2)), color, 2)
                        cv2.line(heatmap, (fx2, y), (fx2, min(y + dash, fy2)), color, 2)
                    label = "YOLO Face"
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(heatmap, (fx1, fy1 - th - 10), (fx1 + tw + 8, fy1), color, -1)
                    cv2.putText(heatmap, label, (fx1 + 4, fy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.imwrite(pigment_path, heatmap)

            # Analyze spatial distribution of pigmentation spots
            localized_pct = 50
            diffuse_pct = 50
            p_mask = pigment_result.get("mask")
            if p_mask is not None and pigment_result["spots_count"] > 0:
                contours, _ = cv2.findContours(p_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    areas = [cv2.contourArea(c) for c in contours]
                    total_area = sum(areas) if areas else 1
                    max_spot_area = max(areas) if areas else 0
                    concentration = max_spot_area / total_area
                    localized_pct = min(90, max(10, int(concentration * 100)))
                    diffuse_pct = 100 - localized_pct

            pigmentation_data = {
                "clarity_score": pigment_result["clarity_score"],
                "spots_count": pigment_result["spots_count"],
                "intensity": pigment_result["intensity"],
                "heatmap_image": pigment_filename,
                "type_distribution": {
                    "localized": localized_pct,
                    "diffuse": diffuse_pct
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
            # Draw YOLO face box on moisture heatmap
            if face_regions:
                for (fx1, fy1, fx2, fy2) in face_regions:
                    color = (255, 180, 0)
                    dash, gap = 12, 8
                    for x in range(fx1, fx2, dash + gap):
                        cv2.line(texture_map, (x, fy1), (min(x + dash, fx2), fy1), color, 2)
                        cv2.line(texture_map, (x, fy2), (min(x + dash, fx2), fy2), color, 2)
                    for y in range(fy1, fy2, dash + gap):
                        cv2.line(texture_map, (fx1, y), (fx1, min(y + dash, fy2)), color, 2)
                        cv2.line(texture_map, (fx2, y), (fx2, min(y + dash, fy2)), color, 2)
                    label = "YOLO Face"
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(texture_map, (fx1, fy1 - th - 10), (fx1 + tw + 8, fy1), color, -1)
                    cv2.putText(texture_map, label, (fx1 + 4, fy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
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

            recommendation_data = _generate_recommendations(acne_count, severity, pigmentation_data, dryness_data, spot_types)

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
                "recommendations": recommendation_data["recommendations"],
                "conflicts": recommendation_data["conflicts"],
                "routine": recommendation_data["routine"],
                "face_quality": face_quality,
            }

        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e),
                "acne_count": 0,
                "severity": "Unknown",
                "confidence": 0.0,
                "detections": [],
                "result_image": None,
                "recommendations": [],
                "conflicts": [],
                "routine": {"morning": [], "evening": [], "tips": []},
                "face_quality": None,
            }


predictor = AcnePredictor()
