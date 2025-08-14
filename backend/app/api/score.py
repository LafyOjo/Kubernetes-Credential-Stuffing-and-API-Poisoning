# backend/app/api/score.py

from typing import Any, Dict
from datetime import datetime, timedelta, timezone
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from prometheus_client import Counter
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.alerts import Alert
import app.api.security as security
from app.core.events import log_event

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
    "login_attempts_ip_total",
    "Total login attempts by IP",
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

FAILED_USER_ATTEMPTS: Dict[int, list[datetime]] = {}


def is_rate_limited(db: Session, user_id: int, limit: int) -> bool:
    window_seconds = int(os.getenv("FAIL_WINDOW_SECONDS", DEFAULT_FAIL_WINDOW_SECONDS))
    now = datetime.now(timezone.utc)
    attempts = FAILED_USER_ATTEMPTS.get(user_id, [])
    attempts = [t for t in attempts if now - t < timedelta(seconds=window_seconds)]
    FAILED_USER_ATTEMPTS[user_id] = attempts
    return len(attempts) >= limit


def record_attempt(
    db: Session,
    client_ip: str,
    success: bool,
    *,
    with_jwt: bool = False,
    detail: str | None = None,
    user_id: int | None = None,
    fail_limit: int | None = None,
) -> Dict[str, Any]:
    """Record a login attempt and return the same structure as ``score``."""

    LOGIN_ATTEMPTS.labels(ip=client_ip).inc()
    if with_jwt:
        JWT_LOGIN_ATTEMPTS.labels(ip=client_ip).inc()
    else:
        NO_JWT_LOGIN_ATTEMPTS.labels(ip=client_ip).inc()

    if success:
        if user_id is not None:
            FAILED_USER_ATTEMPTS.pop(user_id, None)
        log_event(db, None, "stuffing_attempt", True)
        return {"status": "ok", "fails_last_minute": 0}

    ip_fail_limit = int(os.getenv("FAIL_LIMIT", DEFAULT_FAIL_LIMIT))
    window_seconds = int(os.getenv("FAIL_WINDOW_SECONDS", DEFAULT_FAIL_WINDOW_SECONDS))
    window_start = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
    fail_count = (
        db.query(Alert)
        .filter(Alert.ip_address == client_ip)
        .filter(Alert.timestamp >= window_start)
        .count()
    )

    if user_id is not None:
        window_seconds_user = int(
            os.getenv("FAIL_WINDOW_SECONDS", DEFAULT_FAIL_WINDOW_SECONDS)
        )
        now = datetime.now(timezone.utc)
        attempts = FAILED_USER_ATTEMPTS.get(user_id, [])
        attempts = [t for t in attempts if now - t < timedelta(seconds=window_seconds_user)]
        attempts.append(now)
        if fail_limit is not None and len(attempts) > fail_limit:
            attempts = attempts[-fail_limit:]
        FAILED_USER_ATTEMPTS[user_id] = attempts

    # Record the failed attempt for the event log.  The username is unknown at
    # this stage so ``None`` is stored.
    log_event(db, None, "stuffing_attempt", False)

    if security.SECURITY_ENABLED and fail_count >= ip_fail_limit:
        STUFFING_DETECTIONS.labels(ip=client_ip).inc()
        log_event(db, None, "stuffing_block", True)
        alert = Alert(
            ip_address=client_ip,
            total_fails=fail_count + 1,
            detail="Blocked: too many failures",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return {"status": "blocked", "fails_last_minute": fail_count + 1}

    alert = Alert(
        ip_address=client_ip,
        total_fails=fail_count + 1,
        detail=detail or "Failed login",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"status": "ok", "fails_last_minute": fail_count + 1}


@router.post("/score", response_model=Dict[str, Any])
def score(payload: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
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
    if security.SECURITY_ENABLED:
        try:
            security.verify_chain(request.headers.get("X-Chain-Password"))
        except HTTPException as exc:
            STUFFING_DETECTIONS.labels(ip=request.client.host).inc()
            log_event(db, None, "stuffing_block", True)
            alert = Alert(
                ip_address=request.client.host,
                total_fails=0,
                detail="Blocked: invalid chain token",
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            raise exc

    client_ip = payload.get("client_ip")
    auth_result = payload.get("auth_result")
    with_jwt = bool(payload.get("with_jwt"))

    if client_ip is None or auth_result not in ("success", "failure"):
        raise HTTPException(status_code=422, detail="Invalid payload")

    return record_attempt(
        db,
        client_ip,
        auth_result == "success",
        with_jwt=with_jwt,
    )
