"""
SQLAlchemy ORM models for SkinAI.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    scans: Mapped[list["Scan"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    original_image: Mapped[str] = mapped_column(String(255))
    result_image: Mapped[str] = mapped_column(String(255))
    acne_count: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    spot_types: Mapped[str] = mapped_column(Text, default="{}")
    pigmentation_data: Mapped[str] = mapped_column(Text, default="{}")
    dryness_data: Mapped[str] = mapped_column(Text, default="{}")
    recommendations: Mapped[str] = mapped_column(Text, default="[]")
    conflicts: Mapped[str] = mapped_column(Text, default="[]")
    routine: Mapped[str] = mapped_column(Text, default="{}")
    face_quality: Mapped[str] = mapped_column(Text, default="{}")

    user: Mapped["User"] = relationship(back_populates="scans")
