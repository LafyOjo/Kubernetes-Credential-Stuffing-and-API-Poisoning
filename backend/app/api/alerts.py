# app/api/alerts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime

from app.core.db import get_db
from app.crud.alerts import get_all_alerts
from app.schemas.alerts import AlertRead, AlertStat
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


@router.get("/stats", response_model=list[AlertStat])
def alert_stats(
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user),
):
    """Return aggregated counts of invalid and blocked attempts by minute."""
    alerts = get_all_alerts(db)
    stats = defaultdict(lambda: {"invalid": 0, "blocked": 0})
    for a in alerts:
        minute = a.timestamp.replace(second=0, microsecond=0)
        if a.detail == "Blocked: too many failures":
            stats[minute]["blocked"] += 1
        else:
            stats[minute]["invalid"] += 1

    result = []
    for ts in sorted(stats.keys()):
        result.append(
            {
                "time": ts,
                "invalid": stats[ts]["invalid"],
                "blocked": stats[ts]["blocked"],
            }
        )
    return result
