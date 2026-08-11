import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    UserCreate,
    UserLogin,
    register_user,
    login_user,
)
from services.database import get_db
from utils import _check_rate_limit

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")


router = APIRouter(prefix='', tags=['auth'])

# AUTH ROUTES
# ═══════════════════════════════════════════

@router.post("/auth/register")
async def register(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(f"register:{client_ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please try again later.")
    try:
        return await register_user(data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@router.post("/auth/login")
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(f"login:{client_ip}", max_requests=10):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    try:
        return await login_user(data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")


