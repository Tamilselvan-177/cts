"""FastAPI application entry point with 12-hour auto-sync scheduler."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import dashboard, chat


async def _auto_sync_loop():
    """Re-run ML pipeline every 12 hours automatically."""
    while True:
        await asyncio.sleep(12 * 60 * 60)  # 12 hours
        try:
            from app.api.dashboard import _run_ml_pipeline
            import asyncio as _asyncio
            loop = _asyncio.get_event_loop()
            await loop.run_in_executor(None, _run_ml_pipeline)
            print("[SalesAI] Auto-sync completed (12-hour schedule)")
        except Exception as e:
            print(f"[SalesAI] Auto-sync failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the 12-hour auto-sync task
    task = asyncio.create_task(_auto_sync_loop())
    print("[SalesAI] 12-hour ML auto-sync scheduler started")
    yield
    task.cancel()


app = FastAPI(
    title="AI Sales Forecasting & Decision Support System",
    description="Multi-agent AI backend powered by Gemini 2.5 Flash",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "AI Sales Forecasting API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
