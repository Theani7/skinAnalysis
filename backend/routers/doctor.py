import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from groq import AsyncGroq
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import get_current_user
from services.database import async_session, get_db
from services.models import ChatMessage, ChatSession, Scan

router = APIRouter(prefix="/ai-doctor", tags=["ai-doctor"])

class ChatMessageInput(BaseModel):
    content: str
    weather: Optional[dict] = None

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_session = ChatSession(
        user_id=user["id"],
        title="New Chat"
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user["id"])
        .order_by(ChatSession.updated_at.desc())
    )
    return list(result.scalars().all())

@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def list_messages(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == user["id"])
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars().all())

async def generate_title_background(session_id: str, content: str, api_key: str):
    try:
        async_client = AsyncGroq(api_key=api_key)
        response = await async_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a title generator. Generate a concise 2-4 word title summarizing the user's message. Do NOT use quotes. Just the title."},
                {"role": "user", "content": content}
            ],
            model="llama-3.1-8b-instant",
            max_tokens=15
        )
        title = response.choices[0].message.content.strip().replace('"', '')
        async with async_session() as local_db:
            sess = await local_db.get(ChatSession, session_id)
            if sess:
                sess.title = title
                local_db.add(sess)
                await local_db.commit()
    except Exception:
        pass

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == user["id"])
    )
    session_obj = session_result.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session_obj)
    await db.commit()
    return {"status": "success"}

@router.post("/sessions/{session_id}/chat")
async def chat(
    session_id: str,
    request: ChatMessageInput,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {"response": "The SkinAI Assistant is currently offline for maintenance. Please try again later."}

    session_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == user["id"])
    )
    session_obj = session_result.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    previous_messages = msg_result.scalars().all()

    if not previous_messages:
        # Generate title in the background
        background_tasks.add_task(generate_title_background, session_id, request.content, api_key)

    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.content
    )
    db.add(user_message)
    await db.commit()

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
Current Weather: {json.dumps(request.weather) if request.weather else "Unknown"}

{scan_info}

Please provide professional, empathetic, and expert advice. Keep your answers brief, concise, and straight to the point. Do not use overly long paragraphs. Do not provide definitive medical diagnoses, but give general dermatological guidance based on the scan data and profile.
If the user asks about their routine or products, reference the 'Suggested Routine' and 'Recommendations' provided in their scan results. Explain the purpose of those specific steps if needed.

CRITICAL RULE: You are strictly a Skincare and Dermatological assistant. However, skin health is deeply connected to general wellness (hydration, diet, sleep, stress). If a user asks a general health question (like "how much water should I drink?"), you SHOULD answer it while tying it back to how it benefits their skin.
If the user asks you to write code, solve math problems, write essays, translate text, or answer questions completely unrelated to health or skincare, you MUST politely refuse. Reply with a variation of: "I am a specialized SkinAI Assistant. I can only answer questions related to your skin health, skincare routine, and general wellness." Do NOT fulfill out-of-scope requests.
"""

    messages: list[Any] = [{"role": "system", "content": system_prompt}]
    for msg in previous_messages:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.content})

    try:
        async_client = AsyncGroq(api_key=api_key)
        chat_completion = await async_client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            stream=True,
        )

        async def generator():
            assistant_response = ""
            async for chunk in chat_completion:
                if chunk.choices[0].delta.content is not None:
                    delta = chunk.choices[0].delta.content
                    assistant_response += delta
                    yield f"data: {json.dumps({'content': delta})}\n\n"

            async with async_session() as local_db:
                sess = await local_db.get(ChatSession, session_id)
                if sess:
                    sess.updated_at = datetime.now(timezone.utc)
                    local_db.add(sess)

                new_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=assistant_response
                )
                local_db.add(new_msg)
                await local_db.commit()

        return StreamingResponse(generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
