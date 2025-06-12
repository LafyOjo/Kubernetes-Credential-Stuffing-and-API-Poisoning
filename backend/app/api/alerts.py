# app/api/alerts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud.alerts import get_all_alerts
from app.schemas.alerts import AlertRead
from app.core.security import get_current_user

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"],
)

@router.get("/", response_model=list[AlertRead])
def read_alerts(
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    """Retrieve all alerts from the database."""
    return get_all_alerts(db)
