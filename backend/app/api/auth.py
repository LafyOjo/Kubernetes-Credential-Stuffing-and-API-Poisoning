from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    verify_password, create_access_token, get_password_hash
)
from app.api.dependencies import get_current_user
# import your DB session and User model

router = APIRouter(prefix="/api", tags=["auth"])

# This would normally check against your users table:
fake_users_db = {
    "alice": {
        "username": "alice",
        "hashed_password": get_password_hash("secret"),
    }
}

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_dict = fake_users_db.get(form_data.username)
    if not user_dict or not verify_password(form_data.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user_dict["username"]},
        expires_delta=timedelta(minutes=60)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def read_me(current_user: dict = Depends(get_current_user)):
    return current_user
