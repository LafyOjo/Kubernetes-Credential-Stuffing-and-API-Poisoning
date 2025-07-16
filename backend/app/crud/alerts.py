# app/crud/alerts.py
from sqlalchemy.orm import Session
from app.models.alerts import Alert


def get_all_alerts(db: Session) -> list[Alert]:
    return db.query(Alert).all()
