# SkinAI: Clinical-Grade AI Skin Analysis

SkinAI is a premium Healthcare SaaS platform that leverages multi-spectral computer vision and deep learning to provide professional-grade skin analysis. The system detects Acne, Pigmentation, and Hydration/Texture issues using real-time AI Vision or high-resolution clinical image uploads.

## 🚀 Key Features

- **Live AI Vision Terminal:** Real-time feedback on lighting, alignment, and focus for optimal capture.
- **Multi-Spectral Detection:** 
  - **Acne:** YOLOv8 + Multi-signal CV (HSV/LAB) for inflamed spots, blackheads, and whiteheads.
  - **Pigmentation:** Log-Spectral Melanin Index (M-Index) mapping.
  - **Dryness:** Gabor filter texture analysis for micro-crack detection.
- **Dynamic Heatmaps:** Visualizes pigmentation and moisture levels directly on the user's skin.
- **Personalized Recommendations:** Rule-based engine providing skincare, lifestyle, and medical advice.
- **Premium Healthcare UI:** Ultra-clean, high-contrast interface designed for clinical environments.

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend:** FastAPI (Python 3.9+), OpenCV, TensorFlow/KerasCV.
- **Infrastructure:** Port 3002 (Frontend), Port 8000 (Backend).

## 🏃 Getting Started

### Backend Setup
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python main.py`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 📂 Project Structure

- `frontend/`: React application with premium Dashboard and Analysis views.
- `backend/`: FastAPI server with OpenCV and AI Model integration.
- `backend/services/`: Core logic for image processing and AI prediction.
- `docs/`: Technical specifications and architecture designs.

---
*Note: This system is designed for clinical information purposes and does not replace professional medical diagnosis.*
