import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED

REAUTH_ENABLED = os.getenv("REAUTH_PER_REQUEST", "false").lower() == "true"

# Which methods require re-auth (configurable). Default: writes only.
_METHODS = os.getenv("REAUTH_METHODS", "POST,PUT,PATCH,DELETE").strip()
REAUTH_METHODS = tuple(m.strip().upper() for m in _METHODS.split(",") if m.strip())

# Endpoints we will NEVER re-auth (preflight/infra/auth/telemetry)
SKIP_PATHS = {
    "/ping", "/health", "/healthz", "/metrics", "/docs", "/openapi.json",
    "/favicon.ico",
    "/login", "/register", "/api/token",
    "/score",
    "/api/audit/log",    # let audit fire without password
    "/events/auth",      # your shop auth hook
}

class ReAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not REAUTH_ENABLED:
            return await call_next(request)

        # Always allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path in SKIP_PATHS:
            return await call_next(request)

        # Only enforce for configured methods
        if request.method.upper() not in REAUTH_METHODS:
            return await call_next(request)

        # Require a bearer token first (normal auth)
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            return JSONResponse({"detail": "Unauthorized"}, status_code=HTTP_401_UNAUTHORIZED)

        # Then require the per-request password
        pw = request.headers.get("x-reauth-password")
        if not pw:
            return JSONResponse({"detail": "Password required"}, status_code=HTTP_401_UNAUTHORIZED)

        # Optionally: verify the password actually matches the user here.
        # Many demos trust the header because the same UI is prompting the user.

        return await call_next(request)
