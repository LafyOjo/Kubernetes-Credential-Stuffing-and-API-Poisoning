from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud.events import get_events
from app.schemas.events import EventRead
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("/", response_model=List[EventRead])
def read_events(
    hours: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return get_events(db, hours)
