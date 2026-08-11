# SkinAI Technical Details & Architecture Document

This document provides a comprehensive technical deep dive into the SkinAI platform, covering the system architecture, frontend and backend implementations, the multi-spectral computer vision pipeline, database schemas, and CI/CD workflows.

---

## 1. System Architecture Overview

SkinAI operates on a modern client-server architecture decoupled via REST APIs and Server-Sent Events (SSE). 

- **Frontend**: Single Page Application (SPA) built with React 18, TypeScript, and Vite.
- **Backend**: Asynchronous Python API built with FastAPI, utilizing OpenCV and PyTorch (YOLOv8) for computer vision tasks.
- **Database**: Local SQLite database accessed asynchronously via SQLAlchemy (`aiosqlite`) with Alembic for migrations.
- **AI Integrations**: 
  - On-device inference: `face-api.js` (Frontend)
  - Server-side inference: YOLOv8n (Backend)
  - Cloud LLM Inference: Groq API for LLaMA-3 (Backend AI Doctor)

---

## 2. Frontend Architecture

### 2.1 Frameworks & Libraries
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (with arbitrary value support and custom brand color `#880d1e`)
- **Routing**: Custom lightweight hash/state-based routing (`window.history.pushState`) implemented in `App.tsx` (no `react-router-dom`).
- **Icons**: `lucide-react`
- **Charts**: `recharts` for progress tracking and historical data visualization.
- **Markdown Rendering**: `react-markdown` and `remark-gfm` for rendering the AI Doctor's streaming responses.
- **PDF Generation**: `jspdf` and `html2canvas` for generating clinical reports on the client side.

### 2.2 Core Components & State Management
- **Contexts**:
  - `AuthContext`: Manages JWT tokens, login state, and persistent user profiles via `localStorage`.
  - `ChatContext`: Manages AI Doctor chat sessions, active session states, and message histories.
- **Pages/Views**:
  - `ScanView.tsx`: Integrates the web camera hook (`useCamera`) and real-time face tracking (`useFaceDetection` via `face-api.js`) to provide UI overlays (centering, lighting, bounding boxes) before capturing the image.
  - `ReportView.tsx`: A premium, clinical-style dashboard displaying the JSON response from the backend analysis. It renders dynamic metric rings, heatmaps, and product recommendation cards.
  - `AIDoctorPage.tsx`: A real-time chat interface displaying markdown-rendered SSE streams.

### 2.3 Network Communication
- **API Client**: `axios` instance configured with a base URL (`VITE_API_URL`) and an interceptor that automatically attaches the `skinai_token` from `localStorage` to the `Authorization` header.
- **Streaming**: Native browser `fetch` API and `ReadableStream` are used to process Server-Sent Events (SSE) chunks from the FastAPI AI Doctor endpoint.

---

## 3. Backend Architecture

### 3.1 Frameworks & Libraries
- **Core**: FastAPI (Python 3.11+)
- **Server**: Uvicorn (ASGI)
- **Computer Vision**: `opencv-python-headless`, `ultralytics` (YOLOv8)
- **Database**: `SQLAlchemy[asyncio]`, `aiosqlite`, `alembic`
- **Authentication**: `python-jose[cryptography]`, `passlib[bcrypt]`
- **LLM Integration**: `groq` Python SDK

### 3.2 Application Structure
- `main.py`: Application entry point, CORS middleware configuration, and router inclusions.
- `routers/`:
  - `auth.py`: Login, registration, and profile management.
  - `analyze.py`: Image upload, preprocessing, and triggering the predictor pipeline.
  - `doctor.py`: Chat session management and Groq-powered SSE streaming endpoints.
- `services/`:
  - `predictor.py`: The orchestrator for the CV pipeline.
  - `acne_model.py`: YOLOv8 inference wrapper.
  - `image_processor.py`: Image resizing, padding, and base64 encoding logic.

---

## 4. Computer Vision & AI Pipeline

The core analysis pipeline (`services/predictor.py`) executes a sequential, multi-spectral analysis on the uploaded image.

### 4.1 Face Detection & Masking
1. **Detection**: The image is passed through a dedicated YOLO face model (`YOLO-face.pt`).
2. **Masking**: If a face is found, an elliptical mask is generated to exclude the background, hair, and ears. 
3. **Refinement**: Skin-color thresholding (in YCbCr space) further refines the mask.
4. **Fallback**: If no face is detected (e.g., extreme close-ups), the system falls back to analyzing the full image.

### 4.2 Acne Detection (YOLOv8n)
- A highly optimized YOLOv8 nano model (`best.pt`), trained on a custom dataset of 927 images, runs over the face crops.
- It predicts bounding boxes and confidence scores for blemishes.
- **Spot Classification**: The cropped region of each detected spot is converted to HSV and LAB color spaces. Rule-based color thresholds classify the spot as a `papule`, `pustule`, `blackhead`, `whitehead`, or `comedone`.
- **NMS**: A two-pass Non-Maximum Suppression algorithm (OpenCV NMS followed by a custom 25px distance-based spatial clustering) prevents overlapping duplicate detections.

### 4.3 Pigmentation Mapping
- The image is converted to the LAB color space.
- **Redness**: The `a*` channel is isolated to map erythema (redness).
- **Dark Spots**: The image is converted to HSV, and the `V` (Value) channel is inverted to detect hyperpigmentation.
- **Exclusion**: Strict topological masks are drawn over the eyes, eyebrows, lips, and nostrils to prevent false positives in naturally dark/red areas.

### 4.4 Hydration & Texture (Dryness)
- The skin mask is converted to grayscale.
- **Gabor Filters**: Multi-directional Gabor filters extract fine texture and flake patterns.
- **Top-Hat Transform**: A White Top-Hat morphological transform highlights bright, small textural irregularities (dry patches).

### 4.5 Heatmap Generation
- The normalized pigmentation and dryness arrays are color-mapped using OpenCV's `COLORMAP_JET`.
- The heatmaps are blended with the original image using `cv2.addWeighted` and returned to the frontend as base64-encoded strings.

---

## 5. Database Schema & Data Models

Database interactions use async SQLAlchemy. Migrations are managed by Alembic.

### 5.1 `users` Table
- `id` (UUID, Primary Key)
- `email` (String, Unique, Indexed)
- `password_hash` (String)
- `name` (String)
- `profile_data` (JSON) - Stores skin type, age, gender, and sensitivities.
- `created_at` / `updated_at` (DateTime)

### 5.2 `scans` Table
- `id` (UUID, Primary Key)
- `user_id` (Foreign Key -> users.id, Indexed)
- `image_path` (String)
- `overall_score` (Integer)
- `acne_severity`, `pigmentation_severity`, `hydration_level` (Strings)
- `acne_count` (Integer)
- `face_quality` (JSON) - Lighting, angle, centering metrics.
- `spot_types` (JSON) - Array of classified spots.
- `recommendations` (JSON) - Actionable advice and product links.
- `routine` (JSON) - Generated AM/PM skincare steps.
- `created_at` (DateTime)

### 5.3 `chat_sessions` & `chat_messages` Tables
- **Sessions**: Tracks `id`, `user_id`, `title`, `created_at`, `updated_at`.
- **Messages**: Tracks `id`, `session_id`, `role` (`user` or `assistant`), `content`, `created_at`.
- *Architecture Note*: The AI Doctor uses Retrieval-Augmented Generation (RAG) by fetching the user's latest `Scan` record and `profile_data` and injecting it into the LLM's system prompt prior to generating a response.

---

## 6. Integrations & Tooling

- **LLaMA-3 via Groq**: Provides ultra-low latency, streaming conversational AI for the AI Doctor feature. The backend uses the `groq` python client with `stream=True` and yields Server-Sent Events.
- **Recommendations Engine**: A deterministic rule-based engine evaluates the severity of acne, dryness, and pigmentation to map to a curated dictionary of skincare active ingredients (e.g., Salicylic Acid, Niacinamide) and appends relevant local/regional product links (e.g., Daraz).

---

## 7. CI/CD & Deployment

### 7.1 GitHub Actions Workflow (`ci.yml`)
1. **Secrets Scanning**: Uses `gitleaks` to ensure no API keys or JWT secrets are committed.
2. **Backend Checks**: 
   - `ruff check .` for Python linting and strict import sorting.
   - `mypy .` for strict static type checking.
   - `pytest tests/` for unit testing (using in-memory SQLite and `pytest-asyncio`).
3. **Frontend Checks**: 
   - `npm run lint` (ESLint)
   - `tsc --noEmit` (TypeScript validation)
   - `vitest` (Component and utility testing)
   - `vite build` (Production build verification)

### 7.2 Docker
- `docker-compose.yml`: Local development setup with hot-reloading.
- `docker-compose.prod.yml`: Production setup serving the built Vite static files via an Nginx container, reverse-proxying API requests to the FastAPI container (running via Gunicorn with Uvicorn workers).

### 7.3 Git LFS
- All `.pt` (PyTorch) and `.h5` (TensorFlow) model weights, as well as `face-api.js` binary shards, are strictly tracked via Git Large File Storage (LFS) configuration (`.gitattributes`).
