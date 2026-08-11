# SkinAI Technical Details & Architecture Document (Extended)

This document provides a highly granular technical deep dive into the SkinAI platform. It is intended for software engineers, ML engineers, and dev-ops seeking to understand the exact implementation details, data flows, and architectural decisions made across the entire stack.

---

## 1. System Architecture Overview

SkinAI operates on a modern client-server architecture decoupled via REST APIs and Server-Sent Events (SSE). 

- **Frontend**: A Single Page Application (SPA) built with React 18, TypeScript, and Vite.
- **Backend**: An asynchronous Python API built with FastAPI, utilizing OpenCV and PyTorch (YOLOv8) for computer vision tasks.
- **Database**: Local SQLite database accessed asynchronously via SQLAlchemy (`aiosqlite`) with Alembic for schema migrations.
- **AI Integrations**: 
  - On-device inference: `face-api.js` (Frontend)
  - Server-side inference: YOLOv8n (Backend)
  - Cloud LLM Inference: Groq API for LLaMA-3 (Backend AI Doctor)

---

## 2. Frontend Architecture Deep Dive

### 2.1 Frameworks & Tooling
- **Build System**: Vite provides lightning-fast HMR and optimized production builds.
- **Language**: Strict TypeScript with ESLint and Prettier for code consistency.
- **Styling**: Tailwind CSS is used extensively for utility-first styling. The project utilizes a custom brand color (`#880d1e`) defined in `tailwind.config.js`.

### 2.2 Routing Strategy
The application utilizes a custom, lightweight hash/state-based routing mechanism implemented directly in `App.tsx` instead of relying on heavy external libraries like `react-router-dom`.
- Navigation state is tracked via `window.history.pushState`.
- The `currentPage` state determines which component is injected into the `<Layout>` container (`LandingPage`, `DashboardHome`, `ScanView`, `ReportView`, `HistoryPage`, `AIDoctorPage`, `ProfilePage`).

### 2.3 State Management & Contexts
State is largely managed through React Contexts to avoid prop drilling:
- **`AuthContext.tsx`**: 
  - Manages JWT tokens, login state, and user profiles.
  - Persists the token to `localStorage` as `skinai_token`.
  - Automatically intercepts API calls to append the Bearer token.
- **`ChatContext.tsx`**: 
  - Manages AI Doctor chat sessions.
  - Tracks `sessions` (an array of `ChatSession` objects) and `messages`.
  - Exposes methods like `createNewChat()` and `selectSession()`.

### 2.4 Core Pages & UI Components
- **`ScanView.tsx`**: 
  - Integrates the `useCamera` hook to capture video streams via `navigator.mediaDevices.getUserMedia()`.
  - Uses `useFaceDetection.ts` (wrapping `face-api.js`) to process video frames in real-time. It draws an alignment UI (an elliptical guide) and checks if the face is centered, properly sized, and looking straight ahead before allowing a capture.
- **`ReportView.tsx`**: 
  - A sophisticated clinical dashboard displaying the JSON response from the backend analysis. 
  - Implements dynamic `ProgressRing` components for severity scoring.
  - Renders heatmaps returned as base64 strings from the backend.
  - Recommends products dynamically using highly stylized Tailwind product cards.
- **`AIDoctorPage.tsx`**: 
  - A real-time chat interface.
  - Uses `react-markdown` and `remark-gfm` to securely render the AI's Markdown responses.
  - Handles SSE streaming chunks iteratively to create a typing effect.

### 2.5 Utilities
- **`generatePDF.ts`**: Utilizes `jspdf` and `html2canvas` to capture the DOM of the `ReportView` and generate a downloadable clinical PDF report entirely on the client side, ensuring no PII image data remains on the server longer than necessary.

---

## 3. Backend Architecture Deep Dive

### 3.1 Frameworks & Execution
- **Web Framework**: FastAPI (Python 3.11+). Chosen for its native asynchronous capabilities and automatic OpenAPI (Swagger) documentation generation.
- **Server**: Uvicorn running as an ASGI server.
- **Dependency Injection**: Extensively uses FastAPI's `Depends` for database session management (`get_db`) and JWT authentication (`get_current_user`).

### 3.2 Security & Authentication (`services/auth.py`)
- **Hashing**: `passlib[bcrypt]` is used to salt and hash user passwords before database storage.
- **Tokens**: `python-jose[cryptography]` generates JSON Web Tokens (JWT). Tokens encode the user's UUID (`sub`) and have a configurable expiration time (default: 7 days).
- **CORS**: Configured strictly in `main.py` via `CORSMiddleware` to allow specific origins (`http://localhost:3000`).

### 3.3 Database Operations (`services/database.py` & `services/models.py`)
- Uses `SQLAlchemy` with the `aiosqlite` async driver to ensure the FastAPI event loop is never blocked by database I/O.
- The `AsyncSessionLocal` session maker provides a transactional context for API endpoints.
- ORM classes (`User`, `Scan`, `ChatSession`, `ChatMessage`) define relationships using SQLAlchemy's `relationship` and `ForeignKey` paradigms.

---

## 4. Computer Vision & AI Pipeline Exhaustive Details

The core analysis pipeline (`services/predictor.py`) orchestrates a sequential, multi-spectral image analysis. Images are uploaded via `POST /analyze` as multipart/form-data.

### 4.1 Face Detection & Elliptical Masking
1. **Model Loading**: The `YOLO-face.pt` model is loaded into memory via the Ultralytics library.
2. **Inference**: The model detects the bounding box of the face.
3. **Mask Generation**: An elliptical mask (`cv2.ellipse`) is generated centered on the bounding box to explicitly exclude background noise, hair, and ears. 
4. **Color Refinement**: The masked area is converted to the YCbCr color space. Skin pixels are isolated using predefined thresholds (`Y: 0-255`, `Cr: 133-173`, `Cb: 77-127`), further refining the mask.

### 4.2 Acne Detection & Spatial Clustering (YOLOv8n)
- **Model**: `best.pt` (a YOLOv8 nano model) is executed on the cropped face region at a resolution of `640x640`.
- **Spot Classification (Color Space Analysis)**:
  - Each detected bounding box is cropped.
  - The crop is converted to both HSV and LAB color spaces.
  - *Rules*: 
    - If high `a*` (redness) and high Saturation → **Papule/Pustule**.
    - If low lightness (`L*`) and low Value (`V`) → **Blackhead**.
    - If high lightness and low Saturation → **Whitehead/Comedone**.
- **Non-Maximum Suppression (NMS)**:
  - First Pass: Standard object detection NMS based on IoU.
  - Second Pass (Spatial Clustering): Since acne spots often occur in clusters that the model might double-detect, a custom Euclidean distance algorithm merges bounding boxes whose centers are within 25 pixels of each other.

### 4.3 Pigmentation & Erythema Mapping
- **Erythema (Redness)**: The image is converted to LAB color space. The `a*` channel is isolated, normalized via `cv2.normalize`, and thresholded.
- **Hyperpigmentation (Dark Spots)**: The image is converted to HSV. The `V` (Value) channel is inverted (so darker areas become brighter in the array).
- **Topological Exclusion**: Pre-defined relative coordinates for eyes, eyebrows, lips, and nostrils are blacked out in the analysis arrays using `cv2.fillPoly` to prevent them from registering as severe pigmentation.

### 4.4 Hydration & Texture (Dryness)
- The skin mask is converted to grayscale.
- **Gabor Filters**: A bank of Gabor filters (varying orientations) is applied via `cv2.filter2D` to extract fine textural frequencies (wrinkles, flakes).
- **White Top-Hat Transform**: A morphological Top-Hat transform (`cv2.morphologyEx(img, cv2.MORPH_TOPHAT, kernel)`) is applied using an elliptical structuring element. This highlights small, bright textural irregularities against the local background (dry patches).

### 4.5 Heatmap Generation
- The normalized pigmentation and dryness NumPy arrays are color-mapped using `cv2.applyColorMap(array, cv2.COLORMAP_JET)`.
- The heatmaps are blended with the original image using `cv2.addWeighted` (e.g., 60% original image, 40% heatmap).
- Results are encoded to JPEG and base64 strings to be served directly in the JSON response payload, avoiding disk I/O.

---

## 5. AI Doctor & LLM Integration (RAG)

### 5.1 Endpoints & Streaming (`routers/doctor.py`)
- `POST /ai-doctor/sessions/{session_id}/chat` receives a JSON payload with the user's message.
- **Context Retrieval (RAG)**:
  - The backend queries the database for the user's `Profile` (age, skin type, gender).
  - It queries the database for the most recent `Scan` belonging to the user.
  - It fetches the historical `ChatMessage` records for the given `session_id`.
- **System Prompt Construction**:
  - A highly specific system prompt is dynamically constructed, instructing the LLM (LLaMA 3) to adopt the persona of an expert dermatologist, injecting the parsed JSON metrics of the user's latest scan.
- **Streaming Response**:
  - The request is sent to the Groq API (`llama3-8b-8192` or `llama3-70b-8192`) with `stream=True`.
  - FastAPI's `StreamingResponse` yields the chunks in `Server-Sent Events (SSE)` format (`data: {"content": "..."}\n\n`).
  - *Asynchronous DB Commit*: Once the generator finishes yielding chunks to the client, a new isolated async database session is spawned to commit the complete assistant response to the SQLite database.

---

## 6. Rules Engine & Recommendations

The system does not rely on LLMs for core medical recommendations to ensure deterministic, safe outcomes. Instead, it relies on a hard-coded Python rules engine (`services/predictor.py` -> `generate_recommendations`):
- Maps `acne_severity` (Low, Moderate, Severe) to specific active ingredients (e.g., Benzoyl Peroxide, Salicylic Acid).
- Maps `hydration_level` (Well Hydrated, Normal, Dry, Very Dry) to ingredients (e.g., Hyaluronic Acid, Ceramides).
- Generates a JSON dictionary comprising:
  - `morning_routine`: Steps (Cleanser, Treatment, Moisturizer, SPF).
  - `evening_routine`: Steps (Double Cleanse, Treatment, Moisturizer).
  - `lifestyle_advice`: Diet and habit suggestions based on severity.
  - `products`: Associated Daraz eCommerce links and placeholder image routes for the frontend product cards.

---

## 7. CI/CD & Deployment Infrastructure

### 7.1 GitHub Actions Workflow (`ci.yml`)
The continuous integration pipeline is strictly typed and verified:
1. **Security Scan**: `gitleaks` checks for exposed `.env` variables or keys.
2. **Backend Validation**: 
   - `ruff check .` ensures PEP-8 compliance and strict import sorting.
   - `mypy . --ignore-missing-imports` ensures strict static typing across Python files.
   - `pytest tests/` runs the test suite against an in-memory SQLite database (`sqlite+aiosqlite:///:memory:`) using `pytest-asyncio`.
3. **Frontend Validation**: 
   - `npm run lint` executes ESLint rules.
   - `npx tsc --noEmit` validates TypeScript types without transpiling.
   - `npm run test` executes Vitest unit tests (with jsdom for DOM mocking).
   - `npm run build` verifies the Vite production build process.

### 7.2 Docker & Containerization
- **Development (`docker-compose.yml`)**: Maps local volumes to containers, utilizing Uvicorn's `--reload` flag for backend hot-reloading and Vite's dev server for the frontend.
- **Production (`docker-compose.prod.yml`)**: 
  - Frontend is compiled to static assets and served natively by an `Nginx` container (alpine).
  - Backend is run via `Gunicorn` managing multiple `Uvicorn` worker processes for high concurrency.
  - The SQLite database volume is persistently mounted to the host to prevent data loss upon container termination.

### 7.3 Git Large File Storage (LFS)
To prevent repository bloat, binary artifacts are tracked via `.gitattributes`:
- PyTorch models (`backend/models/*.pt`)
- Legacy TensorFlow models (`backend/model/*.h5`)
- Frontend face-api.js weights (`frontend/public/models/*`)
- The YOLOv8 training dataset (`data-2/**/*.jpg`)
