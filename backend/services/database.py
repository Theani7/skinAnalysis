"""
Database configuration and session management for SkinAI.
Uses SQLAlchemy async engine with SQLite backend.
"""

import logging
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(BACKEND_DIR, 'skinai.db')}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup. Raises on failure."""
    try:
        async with engine.begin() as conn:
            # Enable WAL mode for better concurrent read performance
            await conn.exec_driver_sql("PRAGMA journal_mode=WAL")
            from services.models import Scan, User  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}")
        raise


async def get_db():
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
