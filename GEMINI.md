# SkinAI - Project Context & Instructions

SkinAI is an AI-powered acne detection and skin analysis platform featuring a React frontend and a FastAPI backend. It utilizes computer vision (OpenCV) and deep learning (KerasCV YOLOv8) to detect and classify acne lesions from skin images.

## Project Overview

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Backend:** FastAPI, Python 3.9+, OpenCV, TensorFlow, KerasCV.
- **AI Model:** YOLOv8 Nano (1 class: acne), weights located at `backend/model/model.h5`.
- **Detection Pipeline:**
  1. Face and skin region detection using Haar cascades.
  2. Multi-signal analysis for acne spot detection (color, texture, contrast).
  3. YOLOv8-based deep learning inference.
  4. Spot classification (comedone, blackhead, whitehead, pustule, papule, inflammatory).

## Building and Running

### Development Environment

The project uses `concurrently` to run both frontend and backend from the root directory.

- **Install All Dependencies:** `npm run install:all`
- **Run Development Servers:** `npm run dev` (Runs backend on `8000` and frontend on `3000` or Vite default)

### Component-Specific Commands

#### Frontend (`/frontend`)
- **Install:** `npm install`
- **Dev:** `npm run dev`
- **Build:** `npm run build`

#### Backend (`/backend`)
- **Install:** `pip install -r requirements.txt`
- **Dev:** `python -m uvicorn main:app --reload`

## Project Structure

```
skin-diseases/
├── backend/            # FastAPI Backend
│   ├── main.py         # API entry point & routes
│   ├── model/          # AI model weights
│   ├── services/       # Detection & processing logic
│   │   ├── predictor.py        # Acne detection & classification
│   │   └── image_processor.py  # OpenCV preprocessing
│   ├── uploads/        # User-uploaded images
│   └── results/        # Detection result images
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── components/ # UI components (Button, Card, etc.)
│   │   ├── pages/      # Application pages (Landing, Camera, Results)
│   │   ├── services/   # API client (Axios)
│   │   └── types/      # TypeScript definitions
└── package.json        # Root scripts and orchestration
```

## Development Conventions

- **Frontend:**
  - Use Functional Components with Hooks.
  - Use Tailwind CSS for styling (mobile-first approach).
  - Define interfaces for API responses in `frontend/src/types/index.ts` and `frontend/src/services/api.ts`.
- **Backend:**
  - Maintain service-based architecture (logic in `services/`).
  - Use `logging` for debugging; avoid bare `print` statements.
  - Follow FastAPI's dependency injection and type hinting patterns.
- **API:**
  - API Base URL: `http://localhost:8000`
  - Key Endpoints: `/upload`, `/process`, `/analyze`, `/model/status`.

## Key Files
- `backend/main.py`: Main entry point for the backend API.
- `backend/services/predictor.py`: Core AI analysis and OpenCV detection pipeline.
- `frontend/src/App.tsx`: Main application router and state management.
- `frontend/src/services/api.ts`: API client and interface definitions.
