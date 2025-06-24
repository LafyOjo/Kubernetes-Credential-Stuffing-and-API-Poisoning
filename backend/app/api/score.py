# backend/app/api/score.py

from typing import Any, Dict
from datetime import datetime, timedelta
import os
from fastapi import APIRouter, Depends, HTTPException
from prometheus_client import Counter
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.alerts import Alert

router = APIRouter(
    prefix="",            # no /api prefix for /score
    tags=["score"],
    responses={404: {"description": "Not Found"}},
)

# Threshold for failures before blocking and the time window to count them.
# Environment variables can override the defaults for easier tuning.
DEFAULT_FAIL_LIMIT = int(os.getenv("FAIL_LIMIT", "5"))
DEFAULT_FAIL_WINDOW_SECONDS = int(os.getenv("FAIL_WINDOW_SECONDS", "60"))

# Prometheus counter for total login attempts, labeled by IP
LOGIN_ATTEMPTS = Counter(
    "login_attempts_total",
    "Total login attempts",
    ["ip"],
)

# Separate counters for requests that present a JWT vs those that do not.
JWT_LOGIN_ATTEMPTS = Counter(
    "login_attempts_jwt_total",
    "Login attempts that included a JWT",
    ["ip"],
)

NO_JWT_LOGIN_ATTEMPTS = Counter(
    "login_attempts_no_jwt_total",
    "Login attempts without a JWT",
    ["ip"],
)

# How many times blocking was triggered (credential stuffing detections)
STUFFING_DETECTIONS = Counter(
    "credential_stuffing_total",
    "Detected credential stuffing attempts",
    ["ip"],
)


@router.post("/score", response_model=Dict[str, Any])
def score(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Expect JSON body:
        {
            "client_ip": "10.0.0.1",
            "auth_result": "failure" | "success",
            "with_jwt": true | false   # optional flag to indicate a JWT was used
        }
    Always increment the Prometheus counter. If "failure", record a row in the alerts
    table and possibly block if there are too many failures within the configured
    time window. The defaults are 5 failures within 60 seconds but can be adjusted
    via the FAIL_LIMIT and FAIL_WINDOW_SECONDS environment variables.
    """
    client_ip = payload.get("client_ip")
    auth_result = payload.get("auth_result")
    with_jwt = bool(payload.get("with_jwt"))

    if client_ip is None or auth_result not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Invalid payload")

    # 1) Increment Prometheus counter for every attempt.
    LOGIN_ATTEMPTS.labels(ip=client_ip).inc()
    if with_jwt:
        JWT_LOGIN_ATTEMPTS.labels(ip=client_ip).inc()
    else:
        NO_JWT_LOGIN_ATTEMPTS.labels(ip=client_ip).inc()

    # 2) If it’s a failure, check how many failures in the configured window.
    if auth_result == "failure":
        fail_limit = int(os.getenv("FAIL_LIMIT", DEFAULT_FAIL_LIMIT))
        window_seconds = int(os.getenv("FAIL_WINDOW_SECONDS", DEFAULT_FAIL_WINDOW_SECONDS))
        window_start = datetime.utcnow() - timedelta(seconds=window_seconds)
        fail_count = (
            db.query(Alert)
              .filter(Alert.ip_address == client_ip)
              .filter(Alert.timestamp >= window_start)
              .count()
        )

        if fail_count >= fail_limit:
            # Already too many fails in the window → block and insert an alert row
            STUFFING_DETECTIONS.labels(ip=client_ip).inc()
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
