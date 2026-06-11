# Design Spec: High-Accuracy Pigmentation Detection

**Date:** 2026-06-11
**Topic:** Adding clinical-grade pigmentation analysis to the SkinAI platform.
**Status:** Draft

## 1. Goal
Implement a robust pigmentation detection system that identifies sun spots, freckles, melasma, and general uneven skin tone. The system must achieve high accuracy by distinguishing pigment from inflammation (acne) and normalizing for varied lighting conditions.

## 2. Backend Architecture (Hybrid Multi-Spectral)

### 2.1 Signal Extraction Pipeline
- **Color Space:** LAB (Lightness, a-red/green, b-yellow/blue).
- **Face Segmentation:** Utilize existing face detection to focus analysis on skin quadrants (Forehead, Cheeks, Chin).
- **Illuminant Normalization:** Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to the `L` channel to neutralize shadows.

### 2.2 Detection Logic
1. **Red-Inhibition Mask:** Identify acne/inflammation using the `a` channel. Subtract these regions from the pigmentation analysis to prevent false positives.
2. **Statistical Baseline:** Calculate the mean ($\mu$) and standard deviation ($\sigma$) of the normalized `L` channel across healthy skin regions.
3. **Z-Score Thresholding:** Flag pixels where $L < \mu - (k \cdot \sigma)$, where $k$ is a tunable sensitivity parameter (typically 2.0 - 3.0).
4. **Morphological Filtering:** Use open/close operations to remove noise and connect adjacent pigmented pixels into clusters.

### 2.3 Classification
- **Localized Pigment:** Clusters with high contrast and small area (e.g., sun spots).
- **Diffuse Pigment:** Larger areas with lower contrast variance (e.g., melasma or general unevenness).

## 3. API Changes
- **Response Extension:** Add `pigmentation_data` object:
    - `clarity_score`: 0-100 (100 = perfectly even).
    - `spots_count`: Integer count of localized spots.
    - `heat_map_url`: Path to a generated heatmap image overlay.
    - `type_distribution`: { 'localized': percentage, 'diffuse': percentage }.

## 4. Frontend Implementation (Dashboard Integration)

### 4.1 Results Page Update
- **Tabs:** Add a "Pigmentation" tab alongside "Acne Analysis".
- **Clarity Gauge:** A circular progress ring showing the Clarity Score.
- **Interactive Heatmap:** A toggle on the result image that overlays the detected pigment heatmap.
- **Insights Card:** Detailed breakdown of localized vs. diffuse pigmentation.

### 4.2 UI/UX
- Use the established **Glassmorphism** aesthetic.
- Color coding: Use a deep Amber/Brown for pigmentation results to distinguish from the Emerald/Red used for acne.

## 5. Success Criteria
- [ ] Accuracy: Correctly identifies 90%+ of visible sun spots in test images.
- [ ] Specificity: Does not flag red acne lesions as pigmentation (Red-Inhibition works).
- [ ] Robustness: Consistent results across different skin tones and moderate lighting variations.
