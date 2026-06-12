# AGENTS.md — SkinAI Repository Guide

## Quick Commands

```bash
# Run both frontend + backend (port 3000 + 8000)
npm run dev

# Backend only
cd backend && python -m uvicorn main:app --reload

# Frontend only
cd frontend && npm run dev

# Install everything
npm run install:all

# Docker (local)
docker compose up --build
```

## Verification Order

Always run in this order:
1. `cd frontend && npm run lint` — ESLint + TypeScript
2. `cd frontend && npx tsc --noEmit` — Type check
3. `cd frontend && npm run test` — Vitest
4. `cd backend && ruff check .` — Python lint
5. `cd backend && pytest tests/` — Python tests (requires `SKINAI_JWT_SECRET` env var)
6. `cd frontend && npm run build` — Vite build

## Critical Gotchas

- **JWT secret required**: Backend crashes on startup without `SKINAI_JWT_SECRET` env var. Set it in `backend/.env` (copy from `.env.example`).
- **Python 3.11+ required**: Uses `X | Y` union syntax and `asyncio.to_thread()`.
- **TensorFlow 2.15+ pinned**: `numpy>=1.24.0,<2.0` in requirements.txt — do not bump numpy to 2.x.
- **face-api.js models**: Downloaded from GitHub at build time, stored in `frontend/public/models/`. These files are gitignored.
- **YOLO face model**: `backend/models/YOLO-face.pt` (6MB) is gitignored. Download from releases or model registry.
- **SQLite WAL mode**: Database uses WAL journaling. Do not use `check_same_thread=False` — async engine handles this.
- **Rate limiting**: In-memory rate limiter on `/auth/login` (10/min) and `/auth/register` (5/min). Resets on server restart.

## Architecture

### Frontend (`frontend/`)
- React 18 + TypeScript + Vite + Tailwind CSS
- Routes managed in `App.tsx` with `history.pushState` (no React Router)
- State: Props drilling + `sessionStorage` for scan results (no Redux/Zustand)
- Face detection: `useFaceDetection.ts` loads face-api.js models from `/models`
- PDF generation: `jspdf` in `utils/generatePDF.ts`
- API base URL: `VITE_API_URL` env var (defaults to `http://localhost:8000`)

### Backend (`backend/`)
- FastAPI async app in `main.py`
- Auth: `services/auth.py` — JWT + bcrypt, timing-safe login
- Database: `services/database.py` — SQLAlchemy async + aiosqlite
- Models: `services/models.py` — User, Scan tables
- AI: `services/predictor.py` (YOLOv8) + `services/image_processor.py` (OpenCV)
- Structured logging: `services/logging_config.py` — JSON (prod) / colored (dev)
- Alembic migrations in `backend/alembic/`

### Key Boundaries
- Frontend talks to backend via `/api/*` proxy (nginx in Docker, CORS in dev)
- Backend serves images from `/images/` and `/results/` — these are public (no JWT)
- Face detection runs in browser (face-api.js), acne detection runs server-side (YOLOv8)

## Testing

```bash
# Backend (in-memory SQLite, auto-async)
cd backend && SKINAI_JWT_SECRET=test pytest tests/ -v

# Frontend (vitest + jsdom)
cd frontend && npm run test

# Single test file
cd backend && SKINAI_JWT_SECRET=test pytest tests/test_auth.py -v
cd frontend && npx vitest run src/__tests__/api.test.ts
```

Backend tests use `conftest.py` with:
- In-memory SQLite per test
- Rate limiter cleared between tests
- FastAPI test client with dependency overrides

## CI Pipeline

GitHub Actions runs: secrets-scan → backend-ci + frontend-ci (parallel) → docker-build → deploy

- Backend CI: ruff → mypy → pytest with coverage
- Frontend CI: eslint → tsc → vitest → vite build
- Docker: Builds both images, scans with Trivy (fails on CRITICAL), pushes to ghcr.io

## Code Style

- **Python**: ruff (line-length 120, target py311). Imports sorted with isort rules.
- **TypeScript**: ESLint with @typescript-eslint + react-hooks. `no-explicit-any: off` (intentional).
- **Tailwind**: Mobile-first responsive. Use `sm:`, `md:`, `lg:` breakpoints consistently.
- **Naming**: Components are PascalCase files (`DashboardShell.tsx`), hooks are camelCase (`useCamera.ts`).
