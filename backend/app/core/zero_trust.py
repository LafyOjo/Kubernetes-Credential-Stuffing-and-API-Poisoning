import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED

from app.core.db import SessionLocal
from app.api.score import record_attempt


API_KEY = os.getenv("ZERO_TRUST_API_KEY")


class ZeroTrustMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not API_KEY:
            return await call_next(request)
        if request.url.path in {"/ping", "/login", "/register", "/api/token"}:
            return await call_next(request)
        if request.method == "OPTIONS" or request.url.path == "/api/audit/log":
            return await call_next(request)
        header = request.headers.get("X-API-Key")
        if header != API_KEY:
            client_ip = request.client.host if request.client else "unknown"
            with SessionLocal() as db:
                record_attempt(db, client_ip, False, detail="Invalid API key")
            return JSONResponse({"detail": "Invalid API key"}, status_code=HTTP_401_UNAUTHORIZED)
        return await call_next(request)
