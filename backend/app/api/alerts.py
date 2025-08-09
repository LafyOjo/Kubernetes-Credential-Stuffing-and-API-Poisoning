# app/api/alerts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.core.db import get_db
from app.crud.alerts import get_all_alerts
from app.schemas.alerts import AlertRead, AlertStat, AlertSummary
from app.api.dependencies import get_current_user
from app.models.alerts import Alert

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"],
)


@router.get("/", response_model=list[AlertRead])
def read_alerts(db: Session = Depends(get_db)):
    return get_all_alerts(db)


@router.get("/stats", response_model=list[AlertStat])
def read_alert_stats(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Aggregate alert counts per minute."""
    rows = (
        db.query(
            func.strftime("%Y-%m-%d %H:%M:00", Alert.timestamp).label("time"),
            func.sum(
                case((Alert.detail == "Blocked: too many failures", 1), else_=0)
            ).label("blocked"),
            func.sum(
                case((Alert.detail != "Blocked: too many failures", 1), else_=0)
            ).label("invalid"),
        )
        .group_by("time")
        .order_by("time")
        .all()
    )
    return [
        {"time": row.time, "invalid": int(row.invalid), "blocked": int(row.blocked)}
        for row in rows
    ]


@router.get("/summary", response_model=AlertSummary)
def read_alert_summary(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return aggregate counts of alert types."""
    total = db.query(Alert).count()
    blocked = (
        db.query(Alert)
        .filter(Alert.detail == "Blocked: too many failures")
        .count()
    )
    wrong = total - blocked
    return {
        "total": total,
        "blocked": blocked,
        "wrong_password": wrong,
        "credential_stuffing": blocked,
    }
