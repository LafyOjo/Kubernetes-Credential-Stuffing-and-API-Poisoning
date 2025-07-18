from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.core.db import SessionLocal
from app.crud.access_logs import create_access_log


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        finally:
            username = None
            auth = request.headers.get("Authorization")
            if auth and auth.startswith("Bearer "):
                token = auth.split()[1]
                try:
                    payload = decode_access_token(token)
                    username = payload.get("sub")
                except Exception:
                    username = None
            with SessionLocal() as db:
                create_access_log(db, username, request.url.path)
