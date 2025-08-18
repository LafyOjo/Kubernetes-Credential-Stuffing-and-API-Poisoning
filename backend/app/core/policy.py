import os
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

from app.models.alerts import Alert

log = logging.getLogger(__name__)

FAIL_LIMIT = int(os.getenv("FAIL_LIMIT", 5))
FAIL_WINDOW_SECONDS = int(os.getenv("FAIL_WINDOW_SECONDS", 60))
POLICY_FAIL_MODE = os.getenv("POLICY_FAIL_MODE", "open").lower()  # "open" or "closed"

# Routes that should never be policy-blocked (infra, docs, auth, scoring, telemetry)
DEFAULT_SKIP_PATHS = (
    "/metrics", "/ping", "/health", "/healthz",
    "/docs", "/openapi.json",
    "/score",                 # scoring stays open
    "/login", "/register",    # allow auth
    "/api/token",
    "/api/audit/log",         # telemetry/logging
    "/events/auth",           # your auth-event hook
    "/favicon.ico",
)
EXTRA_SKIP = tuple(p.strip() for p in os.getenv("POLICY_SKIP_PATHS", "").split(",") if p.strip())
SKIP_PATHS = tuple(dict.fromkeys([*DEFAULT_SKIP_PATHS, *EXTRA_SKIP]))  # de-dupe


def assess_risk(db: Session, client_ip: str | None) -> bool:
    """True = allowed, False = block due to too many recent failures."""
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

        # Always let CORS preflights through
        if scope.get("method") == "OPTIONS":
            return await self.app(scope, receive, send)

        request = Request(scope, receive=receive)
        path = request.url.path

        # Skip infra/auth/telemetry
        if path in SKIP_PATHS:
            return await self.app(scope, receive, send)

        # If already authenticated, don't risk-block
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            return await self.app(scope, receive, send)

        # Otherwise apply IP-based risk policy
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else None)
        )

        from app.core.db import SessionLocal
        try:
            with SessionLocal() as db:
                allowed = assess_risk(db, client_ip)
        except SQLAlchemyError as exc:
            log.warning("Policy DB session error; mode=%s; error=%s", POLICY_FAIL_MODE, exc)
            allowed = (POLICY_FAIL_MODE == "open")

        if not allowed:
            resp = JSONResponse({"detail": "Request denied by policy"}, status_code=HTTP_403_FORBIDDEN)
            return await resp(scope, receive, send)

        return await self.app(scope, receive, send)