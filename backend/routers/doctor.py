import json
import os

from fastapi import APIRouter, Depends, HTTPException
from groq import AsyncGroq
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import get_current_user
from services.database import get_db
from services.models import Scan

router = APIRouter(prefix="/ai-doctor", tags=["ai-doctor"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

@router.post("/chat")
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {"response": "The SkinAI Assistant is currently offline for maintenance. Please try again later."}

    # Fetch latest scan
    result = await db.execute(
        select(Scan)
        .where(Scan.user_id == user["id"])
        .order_by(Scan.created_at.desc())
        .limit(1)
    )
    latest_scan = result.scalar_one_or_none()

    profile_data = user.get("profile_data", {})

    scan_info = "No recent scan data available."
    if latest_scan:
        scan_info = f"""
Latest Scan Results (Date: {latest_scan.created_at}):
Severity: {latest_scan.severity}
Acne Count: {latest_scan.acne_count}
Spot Types: {latest_scan.spot_types}
Recommendations: {latest_scan.recommendations}
Suggested Routine: {latest_scan.routine}
"""

    system_prompt = f"""You are an expert AI Dermatologist. Your goal is to help the user understand their skin health and provide actionable advice.

User Profile:
Name: {user.get("name")}
Profile Data: {json.dumps(profile_data)}

{scan_info}

Please provide professional, empathetic, and expert advice. Do not provide definitive medical diagnoses, but give general dermatological guidance based on the scan data and profile. 
If the user asks about their routine or products, reference the 'Suggested Routine' and 'Recommendations' provided in their scan results. Explain the purpose of those specific steps if needed.
"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        async_client = AsyncGroq(api_key=api_key)
        chat_completion = await async_client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
        )
        return {"response": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
