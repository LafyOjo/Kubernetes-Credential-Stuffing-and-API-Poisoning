from datetime import timedelta
import os
import requests
import logging

from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import (
    verify_password,
    create_access_token,
    get_password_hash,
)
from app.api.dependencies import get_current_user
from app.api.dependencies import oauth2_scheme
from app.core.security import revoke_token
from app.core.db import get_db
from app.crud.users import get_user_by_username, create_user
from app.crud.policies import get_policy_for_user
from app.core.events import log_event
from app.schemas.users import UserCreate, UserRead
from app.api.score import record_attempt, is_rate_limited, DEFAULT_FAIL_LIMIT


def is_attack_detected(db: Session, username: str) -> bool:
    """Determine whether the given user is currently under attack.

    The detection here is intentionally simple: it reuses the existing
    rate–limiting mechanism to see if the user has exceeded their
    allowed number of failed attempts.  A real deployment could plug in
    additional anomaly‑detection signals.
    """

    user = get_user_by_username(db, username)
    if not user:
        return False
    policy_obj = get_policy_for_user(db, user)
    fail_limit = policy_obj.failed_attempts_limit if policy_obj else DEFAULT_FAIL_LIMIT
    return is_rate_limited(db, user.id, fail_limit)


router = APIRouter(tags=["auth"])


@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = get_password_hash(user_in.password)
    role = user_in.role or "user"
    user = create_user(db, username=user_in.username, password_hash=hashed, role=role)

    warning: str | None = None
    if os.getenv("REGISTER_WITH_DEMOSHOP", "false").lower() in {"1", "true", "yes"}:
        shop_url = os.getenv("DEMO_SHOP_URL", "http://localhost:3005").rstrip("/")
        try:
            requests.post(
                f"{shop_url}/register",
                json={"username": user_in.username, "password": user_in.password},
                timeout=3,
            )
        except Exception:
            logging.exception(
                "Failed registering user %s with Demo Shop at %s",
                user_in.username,
                shop_url,
            )
            warning = "Demo Shop registration failed"

    response = {"id": user.id, "username": user.username, "role": user.role}
    if warning:
        response["warning"] = warning
    return response


@router.post("/login")
def login(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    user = get_user_by_username(db, user_in.username)
    policy_value = user.policy if user and hasattr(user, "policy") else "NoSecurity"
    policy_obj = get_policy_for_user(db, user) if user else None
    fail_limit = policy_obj.failed_attempts_limit if policy_obj else DEFAULT_FAIL_LIMIT

    if user and is_rate_limited(db, user.id, fail_limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts",
        )

    if not user or not verify_password(user_in.password, user.password_hash):
        log_event(db, user_in.username, "login", False)
        record_attempt(
            db,
            request.client.host,
            False,
            user_id=user.id if user else None,
            fail_limit=fail_limit,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if policy_value == "ZeroTrust" and is_attack_detected(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attack blocked by our automated systems",
        )

    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )
    log_event(db, user.username, "login", True)
    record_attempt(
        db,
        request.client.host,
        True,
        user_id=user.id,
        fail_limit=fail_limit,
    )

    if os.getenv("LOGIN_WITH_DEMOSHOP", "false").lower() in {"1", "true", "yes"}:
        shop_url = os.getenv("DEMO_SHOP_URL", "http://localhost:3005").rstrip("/")
        try:
            requests.post(
                f"{shop_url}/login",
                json={"username": user_in.username, "password": user_in.password},
                timeout=3,
            )
        except Exception:
            log_event(db, user.username, "shop_login_error", False)

    return {"access_token": token, "token_type": "bearer", "policy": policy_value}


@router.post("/api/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, form_data.username)
    policy_value = user.policy if user and hasattr(user, "policy") else "NoSecurity"
    policy_obj = get_policy_for_user(db, user) if user else None
    fail_limit = policy_obj.failed_attempts_limit if policy_obj else DEFAULT_FAIL_LIMIT
    if user and is_rate_limited(db, user.id, fail_limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts",
        )
    if not user or not verify_password(form_data.password, user.password_hash):
        log_event(db, form_data.username, "token", False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if policy_value == "ZeroTrust" and is_attack_detected(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attack blocked by our automated systems",
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )
    log_event(db, user.username, "token", True)
    return {"access_token": access_token, "token_type": "bearer", "policy": policy_value}


@router.get("/api/me")
async def read_me(current_user=Depends(get_current_user)):
    """Return basic information about the authenticated user.

    The credential stuffing simulator expects to see both the username and
    the password hash of the compromised account.  Returning the SQLAlchemy
    model directly can result in the password hash being omitted or the
    object not being JSON serialisable in some environments.  Explicitly
    constructing the response dictionary ensures these fields are always
    present.
    """

    return {
        "id": current_user.id,
        "username": current_user.username,
        "password_hash": current_user.password_hash,
        "role": current_user.role,
    }


@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        revoke_token(token)
        log_event(db, current_user.username, "logout", True)
    except Exception:
        log_event(db, current_user.username, "logout", False)
    return {"detail": "Logged out"}
