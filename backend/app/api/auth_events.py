from typing import List
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.auth_events import AuthEventCreate, AuthEventOut
from app.crud.auth_events import create_auth_event, get_auth_events
from app.core.metrics import (
    record_login_attempt,
    record_credential_stuffing,
    record_block,
    login_request_duration_seconds,
)


router = APIRouter(prefix="/events", tags=["auth-events"])


@router.post("/auth", response_model=AuthEventOut)
def log_auth_event(
    payload: AuthEventCreate, request: Request, db: Session = Depends(get_db)
) -> AuthEventOut:
    t0 = time.perf_counter()
    try:
        username = (payload.username or "unknown")
        client_ip = request.client.host if request.client else "unknown"
        success = bool(payload.success)
        is_stuff = bool(payload.is_credential_stuffing)
        blocked = bool(payload.blocked)
        block_rule = payload.block_rule or ""

        record_login_attempt(username, success)
        if is_stuff:
            record_credential_stuffing(username)
        if blocked:
            record_block(block_rule, username, client_ip)

        return create_auth_event(db, username, payload.action, success, payload.source)
    finally:
        login_request_duration_seconds.observe(time.perf_counter() - t0)

@router.get("/auth", response_model=List[AuthEventOut])
def read_auth_events(
    limit: int = 50, offset: int = 0, db: Session = Depends(get_db)
) -> List[AuthEventOut]:
    return get_auth_events(db, limit=limit, offset=offset)
