import os
import logging
from datetime import datetime, timedelta
from typing import Iterable

from fastapi import Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

from app.models.alerts import Alert

log = logging.getLogger(__name__)

FAIL_LIMIT = int(os.getenv("FAIL_LIMIT", 5))
FAIL_WINDOW_SECONDS = int(os.getenv("FAIL_WINDOW_SECONDS", 60))
# When DB check fails, keep API alive by default
POLICY_FAIL_MODE = os.getenv("POLICY_FAIL_MODE", "open").lower()  # "open" or "closed"

# Endpoints to bypass policy entirely
DEFAULT_SKIP_PATHS = ("/metrics", "/ping", "/health", "/healthz", "/docs", "/openapi.json", "/score", "/favicon.ico")
EXTRA_SKIP = tuple(p.strip() for p in os.getenv("POLICY_SKIP_PATHS", "").split(",") if p.strip())
SKIP_PATHS: tuple[str, ...] = tuple(dict.fromkeys([*DEFAULT_SKIP_PATHS, *EXTRA_SKIP]))  # de-dupe

def assess_risk(db: Session, client_ip: str | None) -> bool:
    """Return True if request is allowed based on recent failures from this IP."""
    if not client_ip:
        return True
    since = datetime.utcnow() - timedelta(seconds=FAIL_WINDOW_SECONDS)
    try:
        count = (
            db.query(Alert)
            .filter(Alert.ip_address == client_ip, Alert.timestamp >= since)
            .count()
        )
        return count < FAIL_LIMIT
    except SQLAlchemyError as exc:
        log.warning("Policy DB check failed; mode=%s; error=%s", POLICY_FAIL_MODE, exc)
        return POLICY_FAIL_MODE == "open"

class PolicyEngineMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive=receive)
        path = request.url.path

        # 1) Skip infra/health/metrics routes
        if path in SKIP_PATHS:
            return await self.app(scope, receive, send)

        # 2) Risk check (fail-open on DB errors)
        from app.core.db import SessionLocal
        try:
            with SessionLocal() as db:
                client_ip = request.client.host if request.client else None
                allowed = assess_risk(db, client_ip)
        except SQLAlchemyError as exc:
            log.warning("Policy DB session error; mode=%s; error=%s", POLICY_FAIL_MODE, exc)
            allowed = (POLICY_FAIL_MODE == "open")

        if not allowed:
            resp = JSONResponse({"detail": "Request denied by policy"}, status_code=HTTP_403_FORBIDDEN)
            return await resp(scope, receive, send)

        return await self.app(scope, receive, send)
