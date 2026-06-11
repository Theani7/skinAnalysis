# Frontend Pages Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor frontend pages to improve readability, styling consistency (Tailwind), and proper API helper usage.

**Architecture:** Standard React/TypeScript components using Tailwind CSS for styling and Framer Motion for animations. Follow established project patterns for API services.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, Lucide React.

---

### Task 1: Refactor ResultsPage.tsx

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Refactor interface and helper functions for readability**
- [ ] **Step 2: Replace inline styles with Tailwind classes**
- [ ] **Step 3: Use getResultImageUrl for the result image**

### Task 2: Refactor CameraPage.tsx

**Files:**
- Modify: `frontend/src/pages/CameraPage.tsx`

- [ ] **Step 1: Refactor useCallback and useEffect blocks for readability**
- [ ] **Step 2: Replace inline styles with Tailwind classes**

### Task 3: Refactor AnalyzePage.tsx

**Files:**
- Modify: `frontend/src/pages/AnalyzePage.tsx`

- [ ] **Step 1: Refactor long functions and condensed JSX for readability**
- [ ] **Step 2: Replace inline styles with Tailwind classes**
- [ ] **Step 3: Use isLoading prop in Button components correctly**

### Task 4: Refactor PreprocessPage.tsx

**Files:**
- Modify: `frontend/src/pages/PreprocessPage.tsx`

- [ ] **Step 1: Refactor functions and JSX for readability**
- [ ] **Step 2: Replace inline styles with Tailwind classes**
- [ ] **Step 3: Use isLoading prop in Button components correctly**

### Task 5: Final Review and Cleanup

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Modify: `frontend/src/pages/ResultsPage.tsx`
- Modify: `frontend/src/pages/CameraPage.tsx`
- Modify: `frontend/src/pages/AnalyzePage.tsx`
- Modify: `frontend/src/pages/PreprocessPage.tsx`

- [ ] **Step 1: Ensure all files follow standard React/JSX formatting**
- [ ] **Step 2: Verify all hardcoded API URLs are replaced with helpers**
- [ ] **Step 3: Verify Tailwind usage and remove remaining inline styles**
