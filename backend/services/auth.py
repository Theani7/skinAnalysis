"""
Authentication service for SkinAI.
JWT-based auth with bcrypt password hashing.
Uses SQLAlchemy async sessions for user persistence.
"""

import os
import re
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.database import get_db
from services.models import User

# ── Config ──

SECRET_KEY = os.getenv("SKINAI_JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("SKINAI_JWT_SECRET environment variable is required")

_WEAK_SECRETS = {"secret", "change-me", "change-in-production", "skinai-dev-secret-change-in-production-2024", "your-secret-key", "generate-a-strong-random-secret-here"}
_env = os.getenv("SKINAI_ENV", "development")
if _env != "test" and (SECRET_KEY.lower().strip() in _WEAK_SECRETS or len(SECRET_KEY) < 32):
    raise RuntimeError(
        f"SKINAI_JWT_SECRET is weak or predictable (length={len(SECRET_KEY)}). "
        "Generate a strong secret: python3 -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

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

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 100:
            raise ValueError("Name must be 1-100 characters.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email format.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters.")
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 100:
            raise ValueError("Name must be 1-100 characters.")
        return v


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
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        name=data.name,
        email=data.email,
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

    # Always run verify to prevent timing side-channel
    password_hash = user.password_hash if user else "$2b$12$dummyhashdummyhashdummyhashdummyhashdum"
    if not user or not pwd_context.verify(data.password, password_hash):
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

    user.name = data.name
    await db.flush()
    return _user_response(user)
