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
from typing import Dict, List, Tuple

# mypy: ignore-errors
import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

YOLO_FACE_MODEL_PATH = os.path.join(MODELS_DIR, "YOLO-face.pt")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)



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
    """Create a mask of skin-colored regions using multi-range detection."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)

    # Wide-range skin detection covering light to dark skin tones
    mask_hsv1 = cv2.inRange(hsv, np.array([0, 10, 0]), np.array([25, 170, 255]))
    mask_hsv2 = cv2.inRange(hsv, np.array([0, 10, 0]), np.array([35, 200, 255]))
    mask_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))

    skin_mask = cv2.bitwise_and(cv2.bitwise_or(mask_hsv1, mask_hsv2), mask_ycrcb)

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

        # Refine with skin color inside the ellipse (wide range for all skin tones)
        skin_hsv1 = cv2.inRange(hsv, np.array([0, 10, 0]), np.array([25, 170, 255]))
        skin_hsv2 = cv2.inRange(hsv, np.array([0, 10, 0]), np.array([35, 200, 255]))
        skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_color = cv2.bitwise_and(cv2.bitwise_or(skin_hsv1, skin_hsv2), skin_ycrcb)

        # Combine: must be inside ellipse AND have skin color
        refined = cv2.bitwise_and(ellipse_mask, skin_color)

        # Morphological cleanup to fill small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel, iterations=2)
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel, iterations=1)

        face_mask = cv2.bitwise_or(face_mask, refined)

    return face_mask
