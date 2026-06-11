# Design Spec: Clinical Dryness & Texture Analysis

**Date:** 2026-06-11
**Topic:** Implementing visual dehydration and roughness analysis.
**Status:** Draft

## 1. Goal
Detect and quantify skin dryness, dehydration, and roughness from standard RGB images. The system must distinguish between temporary dehydration (fine texture cracks) and permanent wrinkles, and identify areas of flakiness (desquamation).

## 2. Backend Architecture (Texture & Reflectance Pipeline)

### 2.1 Micro-Relief Analysis
- **Technique:** Gray-Level Co-occurrence Matrix (GLCM) or Local Binary Patterns (LBP).
- **Metric:** Entropy and Contrast. High entropy in skin regions indicates a chaotic micro-relief pattern characteristic of dryness.
- **Frequency Filtering:** Use Gabor Filter Banks at multiple orientations to isolate high-frequency "crack" patterns from low-frequency structural wrinkles.

### 2.2 Reflectance Analysis (Hydration Signal)
- **Technique:** Specular Highlight Gradient Analysis.
- **Logic:** Hydrated skin has a high "Specular-to-Diffuse" ratio. We will analyze the intensity falloff of skin highlights. A "flat" or "matte" falloff across the T-zone or cheeks (where natural oils should be) flags as dryness.

### 2.3 Flakiness Detection (Desquamation)
- **Technique:** White Top-Hat Transform (Opening(I) - I).
- **Logic:** Isolates tiny, bright, high-contrast anomalies (flakes) sitting on the skin surface.

## 3. API Changes
- **Response Extension:** Add `dryness_data` object:
    - `hydration_score`: 0-100 (100 = perfectly hydrated).
    - `texture_roughness`: 0-100 (0 = smooth).
    - `flakiness_count`: Integer count of detected flakes.
    - `texture_map_url`: Path to a teal/blue heatmap overlay.

## 4. Frontend Implementation

### 4.1 Results Page Update
- **New Tab:** "Moisture & Texture".
- **Hydration Gauge:** A teal-colored circular progress ring.
- **Micro-Texture Visualizer:** A toggle to see the "Roughness Heatmap" (Teal/Cyan colors).

## 5. Success Criteria
- [ ] Correctly identifies "matte" skin as less hydrated than "glowing" skin.
- [ ] Distinguishes between fine dehydration lines and deep structural wrinkles.
- [ ] Successfully highlights flaky patches in macro/close-up photos.
