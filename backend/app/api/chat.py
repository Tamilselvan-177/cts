"""
Chat / AI Assistant API endpoint.
Handles multi-session chat history, tracking chats by session_id.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, HTTPException, Path as APIPath
from pydantic import BaseModel
from typing import Optional

from app.agents.orchestrator import handle_query
from app.agents.viz_agent import generate_chart_spec
from app.services.data_service import ML_OUTPUT_DIR

router = APIRouter(prefix="/api/chat", tags=["chat"])

# File to store chat history locally
HISTORY_FILE = ML_OUTPUT_DIR.parent / "chat_sessions.json"

def _load_history() -> dict:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text())
        except:
            return {}
    return {}

def _save_history(data: dict):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(data, indent=2))


class ChatRequest(BaseModel):
    query: str
    generate_viz: bool = False
    session_id: Optional[str] = None


class VizRequest(BaseModel):
    query: str


@router.post("/ask")
async def ask_assistant(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        result = await handle_query(req.query, include_viz=req.generate_viz)
        
        # Session Management
        history = _load_history()
        session_id = req.session_id
        
        if not session_id or session_id not in history:
            # Create a new session
            session_id = session_id or str(uuid.uuid4())
            # Use first 30 chars of the query as the title
            title = req.query[:30] + ("..." if len(req.query) > 30 else "")
            history[session_id] = {
                "id": session_id,
                "title": title,
                "created_at": datetime.now().isoformat(),
                "messages": []
            }
            
        # Append message
        history[session_id]["messages"].append({
            "timestamp": datetime.now().isoformat(),
            "query": req.query,
            "response": result.get("answer"),
            "visualization": result.get("visualization"),
            "agent_data": result.get("agent_data")
        })
        
        _save_history(history)
        
        # Include session_id in the response so the frontend knows what chat it is
        result["session_id"] = session_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def get_sessions():
    """Return all previous chat sessions (metadata only, no messages)."""
    history = _load_history()
    # Sort by created_at descending
    sessions = []
    for sid, data in history.items():
        sessions.append({
            "id": sid,
            "title": data.get("title", "New Chat"),
            "created_at": data.get("created_at")
        })
    sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str = APIPath(...)):
    """Return the full message history for a specific session."""
    history = _load_history()
    if session_id not in history:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": history[session_id]}


@router.post("/visualize")
async def generate_visualization(req: VizRequest):
    """Generate a chart spec from a natural language request."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        spec = await generate_chart_spec(req.query)
        return spec
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
