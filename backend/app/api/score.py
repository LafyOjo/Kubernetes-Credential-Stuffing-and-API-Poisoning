# backend/app/api/score.py

from typing import Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from prometheus_client import Counter
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.alerts import Alert

router = APIRouter(
    prefix="",            # no /api prefix for /score
    tags=["score"],
    responses={404: {"description": "Not Found"}},
)

# Prometheus counter for total login attempts, labeled by IP
LOGIN_ATTEMPTS = Counter(
    "login_attempts_total",
    "Total login attempts",
    ["ip"],
)


def get_db():
    """
    Provide a SQLAlchemy Session for each request, then close it.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/score", response_model=Dict[str, Any])
def score(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Expect JSON body: { "client_ip": "10.0.0.1", "auth_result": "failure" or "success" }.
    Always increment the Prometheus counter. If “failure”, record a row in the alerts
    table and possibly block if there are ≥5 failures in the last minute.
    """
    client_ip = payload.get("client_ip")
    auth_result = payload.get("auth_result")

    if client_ip is None or auth_result not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Invalid payload")

    # 1) Increment Prometheus counter for every attempt.
    LOGIN_ATTEMPTS.labels(ip=client_ip).inc()

    # 2) If it’s a failure, check how many failures in the last minute.
    if auth_result == "failure":
        one_minute_ago = Alert.one_minute_ago()
        fail_count = (
            db.query(Alert)
              .filter(Alert.ip_address == client_ip)
              .filter(Alert.timestamp >= one_minute_ago)
              .count()
        )

        if fail_count >= 5:
            # Already 5 fails in last minute → block and insert an “alert” row
            alert = Alert(
                ip_address=client_ip,
                total_fails=fail_count + 1,
                detail="Blocked: too many failures",
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return {"status": "blocked", "fails_last_minute": fail_count + 1}

        # Otherwise, just record this failure normally
        alert = Alert(
            ip_address=client_ip,
            total_fails=fail_count + 1,
            detail="Failed login",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return {"status": "ok", "fails_last_minute": fail_count + 1}

    # 3) On success, we do not create an alert row (but we already counted in Prometheus).
    return {"status": "ok", "fails_last_minute": 0}
