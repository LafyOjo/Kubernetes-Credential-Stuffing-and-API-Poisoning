from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.auth_events import AuthEventCreate, AuthEventOut
from app.crud.auth_events import create_auth_event, get_auth_events

router = APIRouter(prefix="/events", tags=["auth-events"])


@router.post("/auth", response_model=AuthEventOut)
def log_auth_event(payload: AuthEventCreate, db: Session = Depends(get_db)) -> AuthEventOut:
    return create_auth_event(db, payload.user, payload.action, payload.success, payload.source)


@router.get("/auth", response_model=List[AuthEventOut])
def read_auth_events(
    limit: int = 50, offset: int = 0, db: Session = Depends(get_db)
) -> List[AuthEventOut]:
    return get_auth_events(db, limit=limit, offset=offset)
