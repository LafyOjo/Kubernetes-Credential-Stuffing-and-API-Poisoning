from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, is_token_revoked
from app.core.db import get_db
from app.crud.users import get_user_by_username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    request: Request = None,
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        if request is not None:
            from app.models.alerts import Alert
            alert = Alert(ip_address=request.client.host, total_fails=0, detail="Invalid token")
            db.add(alert)
            db.commit()
        raise credentials_exception

    if is_token_revoked(token):
        raise credentials_exception

    # Query the users table for the decoded username
    user = get_user_by_username(db, username)
    if not user:
        raise credentials_exception
    return user


def require_role(required: str):
    def checker(user=Depends(get_current_user)):
        if user.role != required:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return checker


def require_claim(claim: str, value: str):
    def checker(
        user=Depends(get_current_user), token: str = Depends(oauth2_scheme)
    ):
        payload = decode_access_token(token)
        if payload.get(claim) != value:
            raise HTTPException(status_code=403, detail="Insufficient attributes")
        return user

    return checker
