"""
Pigmentation Detection Module

Multi-spectral pigmentation analysis combining:
- LAB a* channel for redness/brownness detection
- HSV V channel for dark patch detection (melasma, sun damage)
- Skin-tone adaptive thresholds
- Per-spot classification (freckle, sun spot, melasma, PIH)
- DBSCAN spatial clustering for localized vs diffuse patterns
- Face-area-normalized clarity scoring

Output includes clarity_score, spots_count, intensity, spatial_pattern,
type_distribution, normalized_coverage, heatmap mask and intensity map.
"""

import logging
from typing import Dict, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def _compute_skin_percentiles(skin_mask: np.ndarray, channel: np.ndarray) -> Dict:
    """Compute percentile statistics for a channel within the skin mask."""
    vals = channel[skin_mask > 0]
    if len(vals) < 50:
        return {"mean": 128, "std": 30, "p10": 100, "p25": 115, "p50": 128, "p75": 140, "p90": 155}
    return {
        "mean": float(np.mean(vals)),
        "std": float(np.std(vals)),
        "p10": float(np.percentile(vals, 10)),
        "p25": float(np.percentile(vals, 25)),
        "p50": float(np.percentile(vals, 50)),
        "p75": float(np.percentile(vals, 75)),
        "p90": float(np.percentile(vals, 90)),
    }


def _classify_spot_type(
    cnt: np.ndarray, image: np.ndarray, a_channel: np.ndarray,
    h_channel: np.ndarray,
    exclude_mask: np.ndarray, acne_mask: np.ndarray,
    h: int, w: int, skin_a_stats: Dict,
) -> str:
    """Classify a single pigmentation spot into a type using color, shape, and position features."""
    area = cv2.contourArea(cnt)
    x, y, bw, bh = cv2.boundingRect(cnt)
    cx, cy = x + bw // 2, y + bh // 2

    spot_m = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(spot_m, [cnt], -1, 255, -1)

    spot_a = a_channel[spot_m > 0]

    mean_a = float(np.mean(spot_a)) if len(spot_a) > 0 else 128

    perimeter = cv2.arcLength(cnt, True)
    hull = cv2.convexHull(cnt)
    hull_perimeter = cv2.arcLength(hull, True)
    circularity = (4 * np.pi * area / (perimeter * perimeter)) if perimeter > 0 else 0
    border_irregularity = perimeter / hull_perimeter if hull_perimeter > 0 else 1.0

    rel_x = cx / w
    rel_y = cy / h
    zone = "center"
    if rel_y < 0.35:
        zone = "forehead"
    elif rel_y > 0.65:
        zone = "chin_jaw"
    elif rel_x < 0.35:
        zone = "left_cheek"
    elif rel_x > 0.65:
        zone = "right_cheek"
    elif 0.35 <= rel_x <= 0.65 and 0.4 <= rel_y <= 0.6:
        zone = "nose"

    near_acne = False
    if acne_mask is not None:
        acne_dilated = cv2.dilate(acne_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20)))
        near_acne = np.any((spot_m > 0) & (acne_dilated > 0))

    if area < 80 and circularity > 0.6 and zone in ("left_cheek", "right_cheek", "nose"):
        if mean_a < skin_a_stats["p75"] + 10:
            return "freckle"

    if area > 200 and zone in ("left_cheek", "right_cheek", "forehead"):
        if border_irregularity > 1.3 and mean_a > skin_a_stats["mean"]:
            return "melasma"

    if near_acne and area >= 30:
        return "pih"

    if 50 < area < 500 and zone in ("forehead", "nose", "right_cheek", "left_cheek"):
        if border_irregularity > 1.5 and mean_a > skin_a_stats["p75"]:
            return "sun_spot"

    return "unknown"


def _compute_spatial_pattern(validated_spots: list) -> str:
    """Classify spatial pattern as localized, diffuse, or mixed using DBSCAN clustering."""
    if len(validated_spots) == 0:
        return "none"
    if len(validated_spots) == 1:
        return "localized"

    centroids = []
    for cnt in validated_spots:
        M = cv2.moments(cnt)
        if M["m00"] > 0:
            centroids.append([int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])])
        else:
            x, y, bw, bh = cv2.boundingRect(cnt)
            centroids.append([x + bw // 2, y + bh // 2])

    centroids_arr = np.array(centroids, dtype=np.float32)

    if len(centroids_arr) < 2:
        return "localized"

    try:
        from sklearn.cluster import DBSCAN

        dbscan = DBSCAN(eps=50, min_samples=2).fit(centroids_arr)
        labels = dbscan.labels_
        n_clusters = len(set(labels) - {-1})
        spread = float(np.std(centroids_arr[:, 0]) + np.std(centroids_arr[:, 1])) / 2

        if n_clusters <= 2 and spread < 30:
            return "localized"
        if n_clusters >= 3 or spread > 80:
            return "diffuse"
        return "mixed"
    except ImportError:
        spread = float(np.std(centroids_arr[:, 0]) + np.std(centroids_arr[:, 1])) / 2
        if spread < 30:
            return "localized"
        if spread > 80:
            return "diffuse"
        return "mixed"


def detect_pigmentation(
    image: np.ndarray, skin_mask: np.ndarray, acne_mask: np.ndarray,
    face_regions: list = None,
) -> Dict:
    """
    Multi-spectral pigmentation detection with skin-tone adaptive thresholds.

    Detects both small spots and large diffuse patches (melasma, sun damage).
    Excludes eyebrows, eyes, lips, nostrils using adaptive thresholds.
    Classifies individual spots and computes spatial clustering.

    Args:
        image: BGR image (H, W, 3)
        skin_mask: Binary mask of detected skin region
        acne_mask: Binary mask of detected acne regions (to exclude)
        face_regions: List of (x1, y1, x2, y2) face bounding boxes from YOLO

    Returns:
        Dict with keys:
            clarity_score, spots_count, intensity, normalized_coverage,
            face_area, spatial_pattern, type_distribution, mask, intensity_map
    """
    skin_area = np.count_nonzero(skin_mask)
    if skin_area < 100:
        return _empty_result(skin_mask)

    h, w = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    skin_a_stats = _compute_skin_percentiles(skin_mask, lab[:, :, 1])
    skin_g_stats = _compute_skin_percentiles(skin_mask, gray)

    exclude_mask = _build_exclude_mask(gray, hsv, skin_g_stats, skin_a_stats)
    # Adaptive dilation: smaller for close-ups, larger for full faces
    min_dim = min(h, w)
    if min_dim < 500:
        # Close-up: minimal dilation to preserve pigmented areas
        kernel_ex = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        exclude_mask = cv2.dilate(exclude_mask, kernel_ex, iterations=1)
    else:
        # Full face: standard dilation
        kernel_ex = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        exclude_mask = cv2.dilate(exclude_mask, kernel_ex, iterations=2)

    clean_skin = cv2.bitwise_and(skin_mask, cv2.bitwise_not(exclude_mask))

    # Find largest connected component of skin mask = main face region
    # Used to restrict all detection to the face (removes ears, hands, hair, background)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(skin_mask, connectivity=8)
    face_only = np.zeros_like(skin_mask)
    if num_labels > 1:
        largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        face_only = (labels == largest_label).astype(np.uint8) * 255

    # If face bounding boxes available, use them to further restrict
    # This eliminates ears, neck, hands that are connected to face skin
    if face_regions:
        face_bbox_mask = np.zeros_like(skin_mask)
        for (fx1, fy1, fx2, fy2) in face_regions:
            face_bbox_mask[fy1:fy2, fx1:fx2] = 255
        # Erode the bbox slightly to exclude edges (ears are at the sides)
        erode_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        face_bbox_mask = cv2.erode(face_bbox_mask, erode_kernel, iterations=2)
        face_only = cv2.bitwise_and(face_only, face_bbox_mask)

    # Create a moderately wider skin mask for dark patch detection only
    # Used WITHIN the face region to find melasma that strict mask misses
    mid_skin = cv2.inRange(hsv, np.array([0, 8, 0]), np.array([30, 180, 255]))
    mid_skin = cv2.bitwise_or(mid_skin, skin_mask)  # union with strict mask
    mid_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    mid_skin = cv2.morphologyEx(mid_skin, cv2.MORPH_CLOSE, mid_kernel, iterations=3)
    mid_skin = cv2.morphologyEx(mid_skin, cv2.MORPH_OPEN, mid_kernel, iterations=1)
    # Only use mid_skin where it overlaps with the strict mask's dilated version
    face_region = cv2.dilate(skin_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (30, 30)), iterations=3)
    mid_skin = cv2.bitwise_and(mid_skin, face_region)
    # Exclude upper 35% (eyes/eyebrows) from dark patch detection to avoid shadow bias
    eye_exclusion = np.ones((h, w), dtype=np.uint8) * 255
    eye_exclusion[:int(h * 0.35), :] = 0
    mid_skin = cv2.bitwise_and(mid_skin, eye_exclusion)
    # Restrict to main face component (removes ears, hands, hair)
    if num_labels > 1:
        mid_skin = cv2.bitwise_and(mid_skin, face_only)
    mid_clean = cv2.bitwise_and(mid_skin, cv2.bitwise_not(exclude_mask))

    face_area = _compute_face_area(skin_mask)

    a_channel = lab[:, :, 1]
    a_blur = cv2.bilateralFilter(a_channel, d=9, sigmaColor=75, sigmaSpace=75)
    a_detail = cv2.absdiff(a_channel, a_blur)
    a_detail_eq = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(a_detail)

    skin_a_vals = a_channel[clean_skin > 0]
    if len(skin_a_vals) < 50:
        return _empty_result(skin_mask, face_area)

    skin_a_mean = np.mean(skin_a_vals)
    skin_a_std = np.std(skin_a_vals)

    spot_thresh = max(int(skin_a_stats["p75"] + 5), int(skin_a_mean + 1.5 * skin_a_std))
    spot_mask = cv2.inRange(a_channel, spot_thresh, 255)
    spot_mask = cv2.bitwise_and(spot_mask, clean_skin)

    v_channel = hsv[:, :, 2]
    # Use mid-clean mask for dark patch detection within face region
    mid_v_vals = v_channel[mid_clean > 0]
    skin_v_vals = v_channel[clean_skin > 0]
    if len(mid_v_vals) > 50:
        mid_v_mean = np.mean(mid_v_vals)
        mid_v_std = np.std(mid_v_vals)
        dark_thresh = max(int(mid_v_mean - 1.5 * mid_v_std), int(np.percentile(mid_v_vals, 15)))
        dark_mask = cv2.inRange(v_channel, 0, dark_thresh)
        dark_mask = cv2.bitwise_and(dark_mask, mid_clean)
    elif len(skin_v_vals) > 50:
        skin_v_mean = np.mean(skin_v_vals)
        skin_v_std = np.std(skin_v_vals)
        dark_thresh = max(int(skin_v_mean - 2.0 * skin_v_std), 30)
        dark_mask = cv2.inRange(v_channel, 0, dark_thresh)
        dark_mask = cv2.bitwise_and(dark_mask, clean_skin)
    else:
        dark_mask = np.zeros_like(skin_mask)

    pig_mask = cv2.bitwise_or(spot_mask, dark_mask)

    # Restrict to main face region (removes ears, hands, hair, background)
    pig_mask = cv2.bitwise_and(pig_mask, face_only)

    kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    pig_mask = cv2.morphologyEx(pig_mask, cv2.MORPH_CLOSE, kernel_clean, iterations=2)
    pig_mask = cv2.morphologyEx(pig_mask, cv2.MORPH_OPEN, kernel_clean, iterations=1)
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    pig_mask = cv2.morphologyEx(pig_mask, cv2.MORPH_OPEN, kernel_open, iterations=1)

    if acne_mask is not None:
        acne_halo = cv2.dilate(acne_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        pig_mask[acne_halo > 0] = 0

    validated_spots, validated_mask = _validate_spots(pig_mask, exclude_mask, h, w)

    h_channel = hsv[:, :, 0]
    spot_type_counts: Dict[str, int] = {}
    for cnt in validated_spots:
        spot_type = _classify_spot_type(
            cnt, image, a_channel, h_channel,
            exclude_mask, acne_mask, h, w, skin_a_stats,
        )
        spot_type_counts[spot_type] = spot_type_counts.get(spot_type, 0) + 1

    a_float = cv2.normalize(a_detail_eq, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
    # Invert V channel so dark patches get high intensity in heatmap
    v_float = cv2.normalize(v_channel, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
    v_inverted = 1.0 - v_float
    # Combine: high a* (red) OR low V (dark) both indicate pigmentation
    combined_intensity = np.maximum(a_float, v_inverted)
    intensity_map = np.where(validated_mask > 0, combined_intensity, 0.0)

    pigment_area = np.count_nonzero(validated_mask)
    normalized_coverage = (pigment_area / face_area) * 100 if face_area > 0 else 0

    clarity_score = max(0, min(100, 100 * np.exp(-normalized_coverage * 0.5)))

    if normalized_coverage > 3.0:
        intensity = "High"
    elif normalized_coverage > 1.0:
        intensity = "Moderate"
    else:
        intensity = "Low"

    spatial_pattern = _compute_spatial_pattern(validated_spots)

    return {
        "clarity_score": round(clarity_score, 1),
        "spots_count": len(validated_spots),
        "intensity": intensity,
        "normalized_coverage": round(normalized_coverage, 2),
        "face_area": face_area,
        "spatial_pattern": spatial_pattern,
        "type_distribution": spot_type_counts,
        "mask": validated_mask,
        "intensity_map": intensity_map,
    }


def _empty_result(
    skin_mask: np.ndarray, face_area: int = 0,
) -> Dict:
    """Return a default empty result when skin area is insufficient."""
    return {
        "clarity_score": 100,
        "spots_count": 0,
        "intensity": "Low",
        "normalized_coverage": 0.0,
        "face_area": face_area,
        "spatial_pattern": "none",
        "type_distribution": {},
        "mask": np.zeros_like(skin_mask),
        "intensity_map": np.zeros_like(skin_mask, dtype=np.float32),
    }


def _build_exclude_mask(
    gray: np.ndarray, hsv: np.ndarray,
    skin_g_stats: Dict, skin_a_stats: Dict,
) -> np.ndarray:
    """Build mask excluding non-skin features (eyebrows, lips, eyes, nostrils).

    Uses position-aware zones to prevent dark pigmented patches on cheeks
    from being misclassified as eyebrows/eyes/nostrils.
    """
    h, w = gray.shape
    exclude_mask = np.zeros_like(gray)

    # Eyebrows: only in upper 40% of image (eyebrow zone)
    eyebrow_zone = np.zeros_like(gray)
    eyebrow_zone[:int(h * 0.4), :] = 255
    eyebrow_thresh = max(10, int(skin_g_stats["p10"] * 0.45))
    eyebrow_mask = cv2.inRange(gray, 0, eyebrow_thresh)
    eyebrow_mask = cv2.bitwise_and(eyebrow_mask, eyebrow_zone)
    exclude_mask = cv2.bitwise_or(exclude_mask, eyebrow_mask)

    # Eyes: only in upper 45% of image
    eye_zone = np.zeros_like(gray)
    eye_zone[:int(h * 0.45), :] = 255
    eye_dark_thresh = max(10, int(skin_g_stats["p10"] * 0.35))
    eye_dark = cv2.inRange(gray, 0, eye_dark_thresh)
    eye_white = cv2.inRange(hsv, np.array([0, 0, 220]), np.array([180, 30, 255]))
    eye_mask = cv2.bitwise_or(eye_dark, eye_white)
    eye_mask = cv2.bitwise_and(eye_mask, eye_zone)
    exclude_mask = cv2.bitwise_or(exclude_mask, eye_mask)

    # Lips: only in lower 40%, center 60% (mouth zone)
    lip_zone = np.zeros_like(gray)
    lip_zone[int(h * 0.6):, int(w * 0.2):int(w * 0.8)] = 255
    lip_sat_thresh = max(30, int(skin_a_stats["p50"] * 0.3))
    lip_mask = cv2.inRange(hsv, np.array([0, lip_sat_thresh, 80]), np.array([18, 200, 255]))
    lip_mask2 = cv2.inRange(hsv, np.array([165, lip_sat_thresh, 80]), np.array([180, 200, 255]))
    lip_mask = cv2.bitwise_or(lip_mask, lip_mask2)
    lip_mask = cv2.bitwise_and(lip_mask, lip_zone)
    exclude_mask = cv2.bitwise_or(exclude_mask, lip_mask)

    # Nostrils: only in center 30%, middle 20% vertically (tip of nose only)
    nose_zone = np.zeros_like(gray)
    nose_zone[int(h * 0.5):int(h * 0.65), int(w * 0.35):int(w * 0.65)] = 255
    nostril_thresh = max(5, int(skin_g_stats["p10"] * 0.3))
    nostril_mask = cv2.inRange(gray, 0, nostril_thresh)
    nostril_mask = cv2.bitwise_and(nostril_mask, nose_zone)
    exclude_mask = cv2.bitwise_or(exclude_mask, nostril_mask)

    return exclude_mask


def _compute_face_area(skin_mask: np.ndarray) -> int:
    """Estimate face area using convex hull of the skin mask."""
    skin_coords = np.column_stack(np.where(skin_mask > 0))
    if len(skin_coords) > 50:
        hull = cv2.convexHull(skin_coords[:, ::-1].astype(np.float32))
        return int(cv2.contourArea(hull))
    return int(np.count_nonzero(skin_mask))


def _validate_spots(
    pig_mask: np.ndarray, exclude_mask: np.ndarray, h: int, w: int,
) -> Tuple[list, np.ndarray]:
    """Filter pigmentation contours by size, border, aspect ratio, and exclusion zones."""
    contours, _ = cv2.findContours(pig_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    validated_spots = []
    validated_mask = np.zeros_like(pig_mask)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 15:
            continue

        x, y, bw, bh = cv2.boundingRect(cnt)
        touches_border = x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2

        # Large patches (>500px) are real pigmentation even if touching border
        # Small border-touching contours are likely hair/artifacts
        if touches_border and area < 500:
            continue

        aspect = float(bw) / bh if bh > 0 else 0
        if aspect > 5.0 or aspect < 0.2:
            continue

        cx, cy = x + bw // 2, y + bh // 2
        if exclude_mask[cy, cx] > 0:
            continue

        validated_spots.append(cnt)
        cv2.drawContours(validated_mask, [cnt], -1, 255, -1)

    return validated_spots, validated_mask
