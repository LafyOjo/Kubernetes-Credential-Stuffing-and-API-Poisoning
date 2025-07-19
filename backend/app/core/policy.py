import os
from datetime import datetime, timedelta
from fastapi import Request
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

from app.models.alerts import Alert

FAIL_LIMIT = int(os.getenv("FAIL_LIMIT", 5))
FAIL_WINDOW_SECONDS = int(os.getenv("FAIL_WINDOW_SECONDS", 60))


def assess_risk(db: Session, request: Request) -> bool:
    """Return True if request is allowed based on recent failures."""
    since = datetime.utcnow() - timedelta(seconds=FAIL_WINDOW_SECONDS)
    count = (
        db.query(Alert)
        .filter(Alert.ip_address == request.client.host, Alert.timestamp >= since)
        .count()
    )
    return count < FAIL_LIMIT


class PolicyEngineMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope, receive=receive)
        if request.url.path == "/score":
            await self.app(scope, receive, send)
            return
        # Create DB session lazily to avoid overhead
        from app.core.db import SessionLocal

        with SessionLocal() as db:
            allowed = assess_risk(db, request)
        if not allowed:
            response = JSONResponse(
                {"detail": "Request denied by policy"},
                status_code=HTTP_403_FORBIDDEN,
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
