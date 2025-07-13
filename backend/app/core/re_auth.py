import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED

from app.core.security import decode_access_token, verify_password
from app.core.db import SessionLocal
from app.crud.users import get_user_by_username

REAUTH_REQUIRED = os.getenv("REAUTH_PER_REQUEST", "false").lower() in {"1", "true", "yes"}

class ReAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not REAUTH_REQUIRED:
            return await call_next(request)
        if request.url.path in {"/ping", "/login", "/register", "/api/token"}:
            return await call_next(request)
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "):
            return JSONResponse({"detail": "Missing token"}, status_code=HTTP_401_UNAUTHORIZED)
        token = auth.split()[1]
        try:
            payload = decode_access_token(token)
            username = payload.get("sub")
        except Exception:
            return JSONResponse({"detail": "Invalid token"}, status_code=HTTP_401_UNAUTHORIZED)
        password = request.headers.get("X-Reauth-Password")
        if not password:
            return JSONResponse({"detail": "Password required"}, status_code=HTTP_401_UNAUTHORIZED)
        with SessionLocal() as db:
            user = get_user_by_username(db, username)
            if not user or not verify_password(password, user.password_hash):
                return JSONResponse({"detail": "Invalid credentials"}, status_code=HTTP_401_UNAUTHORIZED)
        return await call_next(request)
