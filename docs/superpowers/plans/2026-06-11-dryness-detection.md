# Clinical Dryness & Texture Detection Implementation Plan

**Goal:** Implement a sophisticated dryness and texture analysis system using micro-pattern recognition and integrate it into the dashboard.

**Tech Stack:** Python (OpenCV, NumPy, SciPy), React, Tailwind CSS.

---

### Task 1: Backend Dryness Logic

**Files:**
- Modify: `backend/services/predictor.py`

- [ ] **Step 1: Implement `_detect_dryness` helper**
  - Use Gabor filters for crack detection.
  - Use White Top-Hat for flake detection.
  - Calculate a unified Hydration Score.

- [ ] **Step 2: Update `analyze_image`**
  - Integrate `_detect_dryness`.
  - Generate a teal-colored "Texture Heatmap".
  - Save heatmap to `RESULTS_DIR`.

---

### Task 2: API & Frontend Type Alignment

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/pages/AnalyzePage.tsx`

- [ ] **Step 1: Add `DrynessData` interface**
  - Fields: `hydrationScore`, `roughnessScore`, `flakesCount`, `textureMapImage`.

- [ ] **Step 2: Update `AnalysisResult` and `AnalysisResponse`**
  - Add optional `drynessData` field.

- [ ] **Step 3: Update mapping in `AnalyzePage.tsx`**
  - Ensure snake_case from backend maps to camelCase in frontend.

---

### Task 3: Results Dashboard Refactor

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Update Tab Switcher**
  - Add a third option: "Moisture".
  - Update icon (use `Droplets` from lucide).

- [ ] **Step 2: Implement Moisture Tab View**
  - Show Hydration Gauge (Teal color).
  - Show Roughness and Flakes metrics.

- [ ] **Step 3: Integrate Texture Heatmap Toggle**
  - Allow user to switch the image view to the Teal texture map.

---

### Task 4: Final Verification
- [ ] Run build and verify no TS errors.
- [ ] Test with a close-up image of dry/textured skin.
