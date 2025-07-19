from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud.access_logs import get_access_logs
from app.schemas.access_logs import AccessLogRead
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/access-logs", tags=["logs"])


@router.get("/", response_model=List[AccessLogRead])
def read_access_logs(
    username: Optional[str] = None,
    hours: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if getattr(current_user, "role", None) != "admin":
        username = getattr(current_user, "username", None)
    return get_access_logs(db, username=username, hours=hours)
