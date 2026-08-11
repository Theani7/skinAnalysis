import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import (
    ChangePassword,
    UserUpdate,
    change_user_password,
    delete_user_account,
    get_current_user,
    update_user_profile,
)
from services.database import get_db

logger = logging.getLogger("skinai")
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
PROCESSED_DIR = os.path.join(BACKEND_DIR, "processed")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")


router = APIRouter(prefix='', tags=['users'])

@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return user


@router.put("/auth/profile")
async def update_profile(
    data: UserUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (name)."""
    try:
        return await update_user_profile(user["id"], data, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update profile.")


@router.put("/auth/password")
async def change_password(
    data: ChangePassword,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the user's password."""
    try:
        await change_user_password(user["id"], data, db)
        return {"status": "success", "message": "Password updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to change password.")


@router.delete("/auth/account")
async def delete_account(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the user's account and all associated data."""
    try:
        await delete_user_account(user["id"], db)
        return {"status": "success", "message": "Account deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account deletion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete account.")


# ═══════════════════════════════════════════
