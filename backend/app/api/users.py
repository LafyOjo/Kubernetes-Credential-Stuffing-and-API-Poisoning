from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.dependencies import get_current_user
from app.crud.events import get_user_activity
from app.schemas.events import EventRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{username}/activity", response_model=list[EventRead])
def user_activity(
    username: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return get_user_activity(db, username, action=None)
