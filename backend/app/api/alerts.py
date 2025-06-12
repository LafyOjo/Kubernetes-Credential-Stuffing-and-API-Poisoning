# app/api/alerts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.crud.alerts import get_all_alerts
from app.schemas.alerts import AlertRead

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"],
)

@router.get("/", response_model=list[AlertRead])
def read_alerts(db: Session = Depends(get_db)):
    return get_all_alerts(db)
