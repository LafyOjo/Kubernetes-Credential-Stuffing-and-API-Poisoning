from datetime import timedelta
import os
import requests

from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.schemas.users import UserCreate, UserRead


router = APIRouter(tags=["auth"])



@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = get_password_hash(user_in.password)
    user = create_user(db, username=user_in.username, password_hash=hashed)

    if os.getenv("REGISTER_WITH_SHOP", "false").lower() in {"1", "true", "yes"}:
        shop_url = os.getenv("SOCK_SHOP_URL", "http://localhost:8080").rstrip("/")
        try:
            requests.post(
                f"{shop_url}/register",
                json={"username": user_in.username, "password": user_in.password},
                timeout=3,
            )
        except Exception:
            pass

    return user


@router.post("/login")
def login(user_in: UserCreate, db: Session = Depends(get_db)):
    user = get_user_by_username(db, user_in.username)
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    if os.getenv("LOGIN_WITH_SHOP", "false").lower() in {"1", "true", "yes"}:
        shop_url = os.getenv("SOCK_SHOP_URL", "http://localhost:8080").rstrip("/")
        try:
            requests.post(
                f"{shop_url}/login",
                json={"username": user_in.username, "password": user_in.password},
                timeout=3,
            )
        except Exception:
            pass

    return {"access_token": token, "token_type": "bearer"}

@router.post("/api/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/me")
async def read_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    revoke_token(token)
    return {"detail": "Logged out"}
