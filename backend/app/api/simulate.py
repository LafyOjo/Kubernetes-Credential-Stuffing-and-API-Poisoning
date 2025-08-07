import os
from typing import List

import requests
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.db import get_db
from app.crud.users import get_user_by_username

router = APIRouter(prefix="/simulate", tags=["simulate"])

SHOP_URL = os.getenv("DEMO_SHOP_URL", "http://localhost:3005").rstrip("/")
COMMON_PASSWORDS: List[str] = [
    "secret",
    "password",
    "123456",
    "letmein",
]


class StuffPayload(BaseModel):
    user: str


@router.post("/stuffing")
def simulate_credential_stuffing(payload: StuffPayload, db: Session = Depends(get_db)):
    user = payload.user

    # Policy enforcement: if the target user is protected by a ZeroTrust policy,
    # short‑circuit the simulation and report the attack as blocked.
    db_user = get_user_by_username(db, user)
    if db_user and getattr(db_user, "policy", "NoSecurity") == "ZeroTrust":
        return {"blocked": True, "detail": "Attack blocked by our automated systems"}

    session = requests.Session()
    success_token = None
    for pw in COMMON_PASSWORDS:
        try:
            resp = session.post(
                f"{SHOP_URL}/login",
                json={"username": user, "password": pw},
                timeout=2,
            )
            if resp.status_code == 200:
                data = resp.json()
                success_token = data.get("access_token")
                break
        except Exception:
            continue
    if not success_token:
        return {"blocked": True}
    cart_resp = session.get(
        f"{SHOP_URL}/cart",
        headers={"Authorization": f"Bearer {success_token}"},
        timeout=2,
    )
    if cart_resp.status_code != 200:
        return {"blocked": True}
    return {"blocked": False, "cart": cart_resp.json()}
