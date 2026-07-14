"""Dashboard API endpoints + data sync status."""
from __future__ import annotations

import asyncio
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.services.data_service import (
    get_executive_summary,
    get_sales_predictions,
    get_inventory_data,
    ML_DATA_DIR,
    ML_OUTPUT_DIR,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Track last sync time
_last_sync: datetime | None = None
_sync_in_progress: bool = False


def _run_ml_pipeline():
    """Run the ML pipeline synchronously (called in background thread)."""
    global _last_sync, _sync_in_progress
    _sync_in_progress = True
    try:
        script = Path(__file__).resolve().parents[3] / "cts_ml_pipeline" / "src" / "train_models.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            _last_sync = datetime.now()
            return {"status": "success", "output": result.stdout[-500:]}
        else:
            return {"status": "error", "error": result.stderr[-500:]}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        _sync_in_progress = False


@router.get("/executive")
async def executive_dashboard():
    try:
        return get_executive_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales")
async def sales_dashboard():
    try:
        return get_sales_predictions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory")
async def inventory_dashboard():
    try:
        return get_inventory_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Immediately re-run the ML pipeline to refresh predictions."""
    global _sync_in_progress
    if _sync_in_progress:
        return {"status": "already_running", "message": "Sync already in progress"}
    background_tasks.add_task(_run_ml_pipeline)
    return {"status": "started", "message": "ML pipeline re-run started in background"}


@router.get("/sync/status")
async def sync_status():
    """Return the last data sync timestamp."""
    return {
        "last_sync": _last_sync.isoformat() if _last_sync else None,
        "sync_in_progress": _sync_in_progress,
        "data_dir": str(ML_DATA_DIR),
        "output_dir": str(ML_OUTPUT_DIR),
    }
