# Personalized Recommendation Engine Implementation Plan

**Goal:** Create a smart recommendation system that provides specific skincare products and routines tailored to analysis results.

---

### Task 1: Backend Recommendation Logic

**Files:**
- Modify: `backend/services/predictor.py`

- [ ] **Step 1: Implement `_generate_recommendations` helper**
  - Inputs: `acne_count`, `severity`, `pigmentation_data`, `dryness_data`.
  - Logic: Apply rules from the design spec.
  - Return: List of dictionaries (id, title, description, priority, category).

- [ ] **Step 2: Integrate into `analyze_image`**
  - Call the helper and include it in the return dictionary.

---

### Task 2: API & Frontend Updates

**Files:**
- Modify: `backend/main.py`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/pages/AnalyzePage.tsx`

- [ ] **Step 1: Include recommendations in /analyze response**
- [ ] **Step 2: Update API interface in api.ts**
- [ ] **Step 3: Update mapping in AnalyzePage.tsx**

---

### Task 3: Enhanced Results UI

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Categorize recommendations**
  - Display separate sections for "Essential Skincare", "Lifestyle Habits", and "Expert Advice".

- [ ] **Step 2: Add "Routine" Card**
  - Summarize an AM/PM routine based on the top 3 recommendations.
