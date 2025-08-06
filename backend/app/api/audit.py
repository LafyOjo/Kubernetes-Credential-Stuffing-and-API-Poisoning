from typing import List

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud.audit import create_audit_log, get_all_activity_for_user
from app.schemas.audit import AuditLogCreate, AuditLogRead
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])

_listeners: List[WebSocket] = []


@router.websocket("/ws")
async def audit_ws(ws: WebSocket):
    """Register a websocket to receive audit events."""
    await ws.accept()
    _listeners.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in _listeners:
            _listeners.remove(ws)


async def _broadcast(event: str) -> None:
    """Send an audit event to all listeners."""
    for ws in list(_listeners):
        try:
            await ws.send_json({"event": event})
        except Exception:
            _listeners.remove(ws)


@router.post("/log")
async def audit_log(log: AuditLogCreate, db: Session = Depends(get_db)):
    """Record an audit event from a frontend and broadcast to listeners."""
    if not log.username or not log.username.strip():
        raise HTTPException(status_code=422, detail="username is required")
    create_audit_log(db, log.username, log.event.value)
    await _broadcast(log.event.value)
    return {"status": "logged"}


@router.get("/activity/{username}", response_model=List[AuditLogRead])
def get_user_activity(
    username: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return audit events for a given user."""
    return get_all_activity_for_user(db, username=username)
