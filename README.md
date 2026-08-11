<div align="center">
  <img src="https://via.placeholder.com/150/880d1e/FFFFFF?text=SkinAI" alt="SkinAI Logo" width="120" height="120" />
  
  <h1>SkinAI: AI-Powered Clinical Skin Analysis</h1>
  
  <p>
    An advanced, clinical-grade skin analysis platform leveraging multi-spectral computer vision and deep learning to detect acne, pigmentation, and hydration issues from facial images.
  </p>

  <!-- Badges -->
  <a href="https://github.com/Theani7/skinAnalysis/actions"><img src="https://img.shields.io/github/actions/workflow/status/Theani7/skinAnalysis/ci.yml?branch=main" alt="Build Status"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/python-3.9+-blue.svg" alt="Python"></a>
  <a href="https://reactjs.org"><img src="https://img.shields.io/badge/react-18-blue.svg" alt="React"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</div>

---

## 📖 Table of Contents
- [✨ Features](#-features)
- [🏗 Tech Stack](#-tech-stack)
- [🧠 AI Detection Pipeline](#-ai-detection-pipeline)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Setup](#quick-setup)
  - [Docker Setup](#docker-setup)
- [📸 Screenshots](#-screenshots)
- [📡 API Endpoints](#-api-endpoints)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [⚠️ Disclaimer](#-disclaimer)

---

## ✨ Features

- **Real-Time Face Detection** — YOLO face detection with live guidance overlay (centering, size, angle metrics) for perfect captures.
- **Acne Detection** — Fine-tuned YOLOv8n detector with bounding boxes around individual blemishes.
- **Pigmentation Analysis** — Advanced LAB `a*` (redness) + HSV `V` (dark patches) analysis with adaptive thresholds and exclusion masks (eyes, lips).
- **Moisture & Texture Analysis** — Gabor filters + White Top-Hat transform for hydration and flake detection.
- **Dynamic Heatmaps** — Visualizes pigmentation and moisture levels with precise jet colormap gradients.
- **AI Doctor (LLaMA 3)** — Real-time streaming AI chatbot via Groq, providing customized conversational advice based on your profile and latest scan.
- **Chat History** — Persistent AI chat sessions with auto-titling for continued skincare journeys.
- **Personalized Recommendations** — Rule-based engine offering actionable skincare, lifestyle, and medical advice, including automated AM/PM routines and product cards.
- **Clinical Report PDF** — Export detailed, professional analysis reports with face images, metrics, and recommendations.
- **Secure Authentication** — JWT-based login/registration with secure profile management.

---

## 🏗 Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| **Backend** | FastAPI, Python 3.9+, OpenCV, Ultralytics YOLOv8 |
| **AI / ML** | YOLOv8n (`best.pt`), YOLO-face (`YOLO-face.pt`), face-api.js, Groq (LLaMA 3) |
| **Database** | SQLite with SQLAlchemy async (aiosqlite) |
| **Infrastructure** | Docker, GitHub Actions CI/CD |

---

## 🧠 AI Detection Pipeline

SkinAI employs a highly optimized, multi-step computer vision pipeline:

1. **Face Detection** — YOLO-face detects face regions, applying elliptical masking + skin-color refinement to isolate the canvas.
2. **Acne Detection** — A custom YOLOv8n detector (`best.pt`) runs on each face crop (falling back to full image if necessary).
3. **Pigmentation Mapping** — LAB `a*` (redness) and HSV `V` (dark patches) extraction, aggressively masking out eyebrows, eyes, lips, and nostrils.
4. **Dryness/Texture Extraction** — Gabor filters combined with White Top-Hat transforms on the skin mask.
5. **Non-Maximum Suppression (NMS)** — Two-pass filtering: OpenCV NMS followed by distance-based clustering (25px merge).
6. **Spot Classification** — HSV/LAB color features classify blemishes into papules, pustules, blackheads, whiteheads, or comedones.
7. **Holistic Recommendations** — A sophisticated rule-based engine generates skincare, lifestyle, and medical advice alongside an AM/PM routine.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ (or Bun)
- [Git LFS](https://git-lfs.github.com/) (Required for AI model files)

### Quick Setup

We use `bun` (or `npm`) for dependency management.

```bash
# 1. Clone the repo (Git LFS auto-pulls models)
git clone https://github.com/Theani7/skinAnalysis.git
cd skinAnalysis

# 2. Pull LFS files explicitly
git lfs pull

# 3. Setup Backend Environment
cp backend/.env.example backend/.env
# Note: Edit backend/.env and add a SKINAI_JWT_SECRET and GROQ_API_KEY

# 4. Install all dependencies (Frontend + Backend Venv)
bun run setup
cd frontend && bun install && cd ..

# 5. Run the full stack locally
bun dev
```
Navigate to `http://localhost:3000` to view the app!

### Docker Setup

For an isolated environment, you can use Docker Compose:

```bash
# Local development (hot-reloading enabled)
docker compose up --build

# Production mode
docker compose -f docker-compose.prod.yml up -d
```

---

## 📸 Screenshots

*(Replace placeholder images with actual UI screenshots)*

| Dashboard | Scan Interface | Clinical Report | AI Doctor Chat |
|---|---|---|---|
| <img src="https://via.placeholder.com/400x250/F8F9FA/880d1e?text=Dashboard" width="250"/> | <img src="https://via.placeholder.com/400x250/F8F9FA/880d1e?text=Live+Scan" width="250"/> | <img src="https://via.placeholder.com/400x250/F8F9FA/880d1e?text=Report" width="250"/> | <img src="https://via.placeholder.com/400x250/F8F9FA/880d1e?text=AI+Doctor" width="250"/> |

---

## 📡 API Endpoints

The backend is powered by FastAPI and provides the following core endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate and retrieve JWT |
| `POST` | `/upload` | Upload and analyze a skin image |
| `GET` | `/scans` | Retrieve user scan history |
| `GET` | `/scans/history/progress` | Get analytical progress chart data |
| `POST` | `/ai-doctor/sessions` | Create a new AI Doctor chat session |
| `POST` | `/ai-doctor/sessions/{id}/chat` | Stream an AI Doctor chat response via SSE |

*(See `http://localhost:8000/docs` while running the backend for the full Swagger UI documentation)*

---

## 🤝 Contributing

Contributions make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ⚠️ Disclaimer

*SkinAI is designed for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
