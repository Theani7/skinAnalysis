"""
Authentication service for SkinAI.
JWT-based auth with bcrypt password hashing.
Uses SQLAlchemy async sessions for user persistence.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database import get_db
from services.models import User

# ── Config ──

SECRET_KEY = os.getenv("SKINAI_JWT_SECRET", "skinai-dev-secret-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# ── Password hashing ──

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT scheme ──

security = HTTPBearer()

# ── Request/Response schemas ──


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    name: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Helpers ──


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at.isoformat(),
    )


# ── Public functions (called from main.py) ──


async def register_user(data: UserCreate, db: AsyncSession) -> TokenResponse:
    """Register a new user. Raises HTTPException on duplicate email."""
    existing = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        password_hash=pwd_context.hash(data.password),
    )
    db.add(user)
    await db.flush()

    token = _create_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


async def login_user(data: UserLogin, db: AsyncSession) -> TokenResponse:
    """Authenticate user and return JWT. Raises HTTPException on failure."""
    result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = _create_token(user.id)
    return TokenResponse(access_token=token, user=_user_response(user))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """FastAPI dependency: extract and verify JWT, return user dict."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return {"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at.isoformat()}


async def update_user_profile(
    user_id: str, data: UserUpdate, db: AsyncSession
) -> UserResponse:
    """Update the current user's profile. Returns updated user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.name = data.name.strip()
    await db.flush()
    return _user_response(user)
