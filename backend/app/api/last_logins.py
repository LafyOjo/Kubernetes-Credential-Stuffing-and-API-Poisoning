from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.dependencies import get_current_user
from app.crud.events import get_last_logins

router = APIRouter(prefix="/api/last-logins", tags=["stats"])


@router.get("/")
def read_last_logins(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    data = get_last_logins(db)
    # convert to ISO strings for JSON
    return {u: ts.isoformat() for u, ts in data.items()}
