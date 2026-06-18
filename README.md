# SkinAI: AI-Powered Skin Analysis Platform

A clinical-grade skin analysis platform that leverages multi-spectral computer vision and deep learning to detect acne, pigmentation, and hydration issues from skin images.

## Features

- **Real-Time Face Detection** — YOLO face detection with live guidance overlay (centering, size, angle metrics)
- **Acne Detection** — YOLOv8n detector with bounding boxes around individual spots
- **Pigmentation Analysis** — LAB a* (redness) + HSV V (dark patches) with adaptive thresholds
- **Moisture/Texture Analysis** — Gabor filter + White Top-Hat transform for hydration and flake detection
- **Dynamic Heatmaps** — Visualizes pigmentation and moisture levels with jet colormap gradients
- **Personalized Recommendations** — Rule-based engine providing skincare, lifestyle, and medical advice with AM/PM routines
- **Clinical Report PDF** — Export detailed analysis reports with face images, metrics, and recommendations
- **JWT Authentication** — Secure login/register with profile management
- **SQLite Database** — Persistent scan history and user data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.9+, OpenCV, Ultralytics YOLOv8 |
| AI Models | YOLOv8n detector (`best.pt`), YOLO-face (`YOLO-face.pt`), face-api.js (frontend guidance) |
| Database | SQLite with SQLAlchemy async (aiosqlite) |
| Auth | JWT tokens, bcrypt password hashing |
| Infrastructure | Docker, GitHub Actions CI/CD |

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Git LFS (for model files)

### Quick Setup (Recommended)

```bash
# Clone the repo (Git LFS auto-pulls models)
git clone https://github.com/Theani7/skinAnalysis.git
cd skinAnalysis

# Install Git LFS if not already installed
brew install git-lfs
git lfs pull

# Install all dependencies and create Python venv
npm run setup

# Run both frontend and backend
npm run dev
```

Open http://localhost:3000

### Manual Setup

```bash
# Install root dependencies (concurrently)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Create Python venv and install backend dependencies
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ..

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env and set SKINAI_JWT_SECRET to a random string

# Run both
npm run dev
```

### Run Individually

```bash
# Backend (port 8000)
cd backend
./venv/bin/python -m uvicorn main:app --reload

# Frontend (port 3000)
cd frontend
npm run dev
```

### Docker Setup

```bash
# Local development
docker compose up --build

# Production
docker compose -f docker-compose.prod.yml up -d
```

## Project Structure

```
skinAnalysis/
├── backend/
│   ├── main.py                 # FastAPI application & routes
│   ├── model/
│   │   └── yolo_acne_detection.h5  # Legacy H5 fallback model (LFS)
│   ├── models/
│   │   ├── best.pt             # YOLOv8n acne detector (LFS)
│   │   └── YOLO-face.pt        # YOLO face detection model (LFS)
│   ├── services/
│   │   ├── predictor.py        # Multi-signal detection pipeline
│   │   ├── acne_model.py       # YOLOv8 detector wrapper
│   │   ├── image_processor.py  # OpenCV preprocessing
│   │   ├── auth.py             # JWT authentication
│   │   ├── database.py         # SQLAlchemy async database
│   │   └── models.py           # User & Scan ORM models
│   ├── alembic/                # Database migrations
│   ├── tests/                  # Pytest test suite
│   ├── uploads/                # User-uploaded images
│   ├── results/                # Detection result images
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── DashboardShell.tsx    # Floating pill sidebar
│   │   │   └── ui/
│   │   │       ├── ConfirmDialog.tsx     # Reusable confirmation modal
│   │   │       ├── ErrorBoundary.tsx     # Error boundary
│   │   │       └── ProgressRing.tsx      # Animated score ring
│   │   ├── hooks/
│   │   │   ├── useCamera.ts             # Camera hook
│   │   │   └── useFaceDetection.ts      # face-api.js detection
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx          # Marketing landing page
│   │   │   ├── LoginPage.tsx            # Login/Register
│   │   │   ├── DashboardHome.tsx        # Dashboard with chart
│   │   │   ├── ScanView.tsx             # Camera + face guidance
│   │   │   ├── ReportView.tsx           # Analysis report
│   │   │   ├── HistoryPage.tsx          # Scan history
│   │   │   └── ProfilePage.tsx          # User profile
│   │   ├── services/
│   │   │   ├── api.ts                   # API client
│   │   │   └── auth.ts                  # Auth service
│   │   └── utils/
│   │       ├── generatePDF.ts           # Clinical report PDF
│   │       └── helpers.ts               # Utility functions
│   ├── public/
│   │   ├── favicon.svg
│   │   └── models/                      # face-api.js model files (LFS)
│   └── package.json
├── data-2/                     # Training dataset (YOLOv8 format, LFS)
├── train_acne_detector.py      # Colab training script for YOLOv8n detector
├── docker-compose.yml          # Development Docker setup
├── docker-compose.prod.yml     # Production Docker setup
├── .github/workflows/ci.yml    # GitHub Actions CI/CD
├── .gitattributes              # Git LFS tracking rules
└── package.json                # Root scripts (concurrently)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/profile` | Update user profile |
| POST | `/upload` | Upload skin image |
| POST | `/analyze` | Analyze uploaded image |
| GET | `/scans` | Get scan history |
| GET | `/scans/{id}` | Get single scan details |
| GET | `/scans/history/progress` | Get progress chart data |
| GET | `/model/status` | Check model status |
| GET | `/health` | Health check |

## AI Detection Pipeline

1. **Face Detection** — YOLO-face detects face regions with elliptical masking + skin-color refinement
2. **Acne Detection** — YOLOv8n detector (`best.pt`) runs on each face crop (falls back to full image if no face)
3. **Pigmentation** — LAB a* (redness) + HSV V (dark patches) with exclusion masks for eyebrows, eyes, lips, nostrils
4. **Dryness/Texture** — Gabor filters + White Top-Hat transform on skin mask
5. **NMS** — Two-pass: OpenCV NMS + distance-based clustering (25px merge)
6. **Spot Classification** — HSV/LAB color features classify papule, pustule, blackhead, whitehead, comedone
7. **Recommendations** — Rule-based skincare, lifestyle, and medical advice with AM/PM routine

## Environment Variables

### Backend (`backend/.env`)

```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
SKINAI_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SKINAI_JWT_SECRET=your-secret-key
SKINAI_DB_PATH=skinai.db
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | Create Python venv and install backend deps |
| `npm run dev` | Run both frontend and backend |
| `npm run dev:backend` | Run backend only |
| `npm run dev:frontend` | Run frontend only |
| `npm run install:all` | Install all dependencies |
| `npm run build` | Build frontend for production |

## License

MIT

---

*This system is designed for clinical information purposes and does not replace professional medical diagnosis.*
