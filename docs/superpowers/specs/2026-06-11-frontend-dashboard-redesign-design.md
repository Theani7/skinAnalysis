# Design Spec: Frontend Dashboard Redesign

**Date:** 2026-06-11
**Topic:** Modernizing the SkinAI frontend to a full-screen dashboard layout.
**Status:** Draft

## 1. Goal
Transform the current mobile-first, narrow-column web app into a modern, full-screen dashboard. The redesign aims to eliminate the "mobile site on laptop" look, improve desktop usability, and adopt a high-end AI aesthetic (Glassmorphism).

## 2. Architecture & Layout
We will move away from the current centered-column layout to a **Sidebar Navigation Dashboard** architecture.

### 2.1 Dashboard Shell (`DashboardShell.tsx`)
- A global wrapper for all application pages.
- **Desktop (>= 1024px):** A fixed sidebar on the left (~260px) and a scrollable main content area.
- **Mobile (< 1024px):** A top navigation bar with a hamburger menu that toggles an overlay sidebar.

### 2.2 Navigation (`Sidebar.tsx`)
- **Brand:** Logo and "SkinAI" title at the top.
- **Nav Links:** Vertical list of primary actions:
    - **Dashboard** (Landing)
    - **Capture Scan** (Camera)
    - **Deep Analysis** (Analyze)
    - **Preprocessing** (Preprocess)
- **Footer:** System status indicators (API Health, Model Load Status).

### 2.3 Main Content Area
- Fluid layout that expands to fill available width.
- Use `max-w-7xl` or `max-w-screen-2xl` for content centering within the workspace.
- **Grid System:**
    - **Landing Page:** Hero section becomes a 2-column layout on desktop.
    - **Feature Cards:** Transition from a vertical list to a 3-column grid.
    - **Results:** Split view with the image on one side and detailed stats on the other.

## 3. Aesthetics & UI Components (Glassmorphism)
- **Theme:** Dark mode base (`#0a0f1a`).
- **Surfaces:** Semi-transparent cards (`bg-white/5`) with `backdrop-filter: blur(20px)` and subtle `1px` borders.
- **Typography:** Inter font. Increased contrast between headings (Bold, tight tracking) and body text.
- **Interactions:** Subtle scale-on-hover for cards and buttons. Gradients for primary CTAs (Emerald to Teal).

## 4. Technical Implementation
- **Layout:** CSS Grid/Flexbox for the shell. Tailwind CSS for responsive breakpoints (`lg:`).
- **State:** React `useState` in `App.tsx` or a layout context to manage sidebar visibility.
- **Animations:** `framer-motion` for page transitions (`AnimatePresence`) and sidebar sliding.
- **Component Refactor:**
    - Replace inline `maxWidth: '28rem'` with responsive Tailwind classes.
    - Update `Navbar.tsx` to be the "Mobile Header" and create `Sidebar.tsx` for desktop.

## 5. Success Criteria
- [ ] No narrow column constraints on desktop.
- [ ] Sidebar is pinned on laptop screens.
- [ ] All pages (Camera, Analyze, Results) adapt to the dashboard shell.
- [ ] Glassmorphism aesthetic is consistently applied.
