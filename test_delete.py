import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from backend.services.models import SavedProduct

async def run():
    engine = create_async_engine("sqlite+aiosqlite:///backend/skinai.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        url = "https://www.daraz.com.np/products/minimalist-06-retinol-serum-for-anti-aging-antioxidant-effects-with-coenzyme-q10-reduces-fine-lines-wrinkles-mid-strength-1-fl-oz-30-ml-i502138389.html"
        res = await db.execute(select(SavedProduct).where(SavedProduct.url == url))
        prod = res.scalar_one_or_none()
        print("Found:", prod)
        if prod:
            await db.delete(prod)
            await db.commit()
            print("Deleted")

asyncio.run(run())
