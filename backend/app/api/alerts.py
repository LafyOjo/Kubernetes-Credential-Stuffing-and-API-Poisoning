# app/api/alerts.py
from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from app.core.db import get_db
# from app.crud.alerts import get_all_alerts
from app.schemas.alerts import AlertRead
from app.core.security import get_current_user

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"],
)

@router.get("/", response_model=list[AlertRead])
def read_alerts(user: str = Depends(get_current_user)):
    """Retrieves all alerts from the database (temporary stub)."""
    return [
        {"id": 1, "name": "Test Alert 1", "description": "This is a dummy alert.", "status": "active"},
        {"id": 2, "name": "Test Alert 2", "description": "Another dummy alert.", "status": "resolved"},
    ]
