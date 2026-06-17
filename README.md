# SkinAI: AI-Powered Skin Analysis Platform

A clinical-grade skin analysis platform that leverages multi-spectral computer vision and deep learning to detect acne, pigmentation, and hydration issues from skin images.

## Features

- **Real-Time Face Detection** — YOLO face detection with live guidance overlay (centering, size, angle metrics)
- **Acne Detection** — YOLOv8 + multi-signal CV (HSV/LAB) for inflamed spots, blackheads, and whiteheads
- **Pigmentation Analysis** — Multi-channel detection (M-Index + LAB a* + HSV V) with adaptive Otsu thresholding
- **Moisture/Texture Analysis** — Gabor filter texture analysis for hydration and micro-crack detection
- **Dynamic Heatmaps** — Visualizes pigmentation and moisture levels with jet colormap gradients
- **Personalized Recommendations** — Rule-based engine providing skincare, lifestyle, and medical advice
- **Clinical Report PDF** — Export detailed analysis reports with face images, metrics, and recommendations
- **JWT Authentication** — Secure login/register with profile management
- **SQLite Database** — Persistent scan history and user data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.9+, OpenCV, TensorFlow, KerasCV |
| AI Models | YOLOv8 (acne), YOLO-face (face detection), face-api.js (frontend guidance) |
| Database | SQLite with SQLAlchemy ORM |
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
│   │   └── model.h5            # YOLOv8 acne detection weights (LFS)
│   ├── models/
│   │   └── YOLO-face.pt        # YOLO face detection model (LFS)
│   ├── services/
│   │   ├── predictor.py        # Acne detection & classification
│   │   ├── image_processor.py  # OpenCV preprocessing & pigmentation
│   │   ├── auth.py             # JWT authentication
│   │   ├── database.py         # SQLAlchemy database setup
│   │   └── models.py           # User & Scan ORM models
│   ├── uploads/                # User-uploaded images
│   ├── results/                # Detection result images
│   ├── venv/                   # Python virtual environment
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

1. **Face Detection** — YOLO-face detects face region with elliptical masking
2. **Skin Segmentation** — HSV-based skin color detection within face region
3. **Acne Detection** — YOLOv8 inference + multi-signal CV (color, texture, contrast)
4. **Pigmentation Analysis** — M-Index + LAB a* + HSV V with majority voting
5. **Moisture Analysis** — Gabor filter texture analysis + local binary patterns
6. **Spot Classification** — Comedone, blackhead, whitehead, pustule, papule, inflammatory
7. **Recommendation Engine** — Rule-based skincare, lifestyle, and medical advice

## Environment Variables

### Backend (`backend/.env`)

```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
SKINAI_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MODEL_PATH=model/model.h5
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
