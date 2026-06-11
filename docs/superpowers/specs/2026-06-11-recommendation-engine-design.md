# Design Spec: Personalized Skincare Recommendation Engine

**Date:** 2026-06-11
**Topic:** Intelligent product and routine matching based on AI skin analysis.
**Status:** Draft

## 1. Goal
Provide users with a scientifically-backed, personalized skincare routine based on their unique analysis results. The engine must prioritize high-risk conditions and suggest compatible ingredients.

## 2. Recommendation Logic (Rule-Based Engine)

### 2.1 Acne-Based Rules
- **Severity: Severe** -> Medical: Dermatologist Consultation (High Priority).
- **Type: Blackheads** -> Skincare: Salicylic Acid (BHA) to unclog pores.
- **Type: Inflammatory** -> Skincare: Benzoyl Peroxide or Adapalene (PM).

### 2.2 Pigmentation-Based Rules
- **Clarity < 85%** -> Skincare: Vitamin C (AM) for brightening.
- **Clarity < 70%** -> Skincare: Retinol (PM) or Alpha Arbutin.
- **Always** -> Skincare: Mineral Sunscreen (SPF 50+) to prevent darkening.

### 2.3 Dryness-Based Rules
- **Hydration < 60%** -> Skincare: Hyaluronic Acid and Ceramides.
- **Roughness > 5%** -> Skincare: Gentle Lactic Acid (AHA) for resurfacing.
- **Flakes Detected** -> Skincare: Occlusive Moisturizer (Barrier Balm).

## 3. Implementation Details

### 3.1 Backend: `_generate_recommendations`
- A new service function that takes `acne_data`, `pigmentation_data`, and `dryness_data`.
- Returns a list of objects matching the frontend `Recommendation` type.

### 3.2 Frontend: Routine Visualizer
- A new section on the Results page that displays the recommended AM/PM routine.
- Interactive product cards with descriptions of "Why it's for you".

## 4. Success Criteria
- [ ] Recommendations change dynamically based on analysis scores.
- [ ] No conflicting advice (e.g., doesn't suggest heavy exfoliation for both severe acne and high dryness).
- [ ] Provides a clear path to action (specific ingredients and timing).
