import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED


API_KEY = os.getenv("ZERO_TRUST_API_KEY")


class ZeroTrustMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not API_KEY:
            return await call_next(request)
        if request.url.path in {"/ping", "/login", "/register", "/api/token"}:
            return await call_next(request)
        header = request.headers.get("X-API-Key")
        if header != API_KEY:
            return JSONResponse({"detail": "Invalid API key"}, status_code=HTTP_401_UNAUTHORIZED)
        return await call_next(request)
