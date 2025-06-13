import os
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
ALGORITHM = "HS256"

auth_scheme = HTTPBearer()


def create_access_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return payload.get("sub")


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce JWT authentication on every request."""

    async def dispatch(self, request: Request, call_next):
        allowed_paths = {"/login", "/register", "/score", "/"}
        if request.url.path in allowed_paths:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})
        try:
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.PyJWTError:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})
        return await call_next(request)

import hashlib


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed
