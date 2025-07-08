from datetime import datetime, timedelta
from typing import Any, Union

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Ensure a secret key is configured before continuing
if not getattr(settings, "SECRET_KEY", None):
    raise RuntimeError(
        "SECRET_KEY environment variable must be set for token operations"
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    data: dict[str, Any],
    expires_delta: Union[timedelta, None] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise

# Track revoked tokens so /logout can invalidate them
revoked_tokens: set[str] = set()


def revoke_token(token: str) -> None:
    """Mark a JWT as revoked."""
    revoked_tokens.add(token)


def is_token_revoked(token: str) -> bool:
    """Return True if the token has been revoked."""
    return token in revoked_tokens
