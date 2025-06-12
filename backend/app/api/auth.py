from fastapi import APIRouter, HTTPException
from app.core.security import create_access_token

router = APIRouter()


@router.post("/login")
def login(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    if username == "admin" and password == "password":
        token = create_access_token({"sub": username})
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")
