from fastapi import APIRouter, HTTPException, Request
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import time

router = APIRouter()

# Prometheus counters
ATTEMPTS = Counter("login_attempts_total", "Total login attempts", ["ip"])
BLOCKED  = Counter("login_blocked_total",  "Total blocked attempts", ["ip"])

# in-memory store: ip -> [(timestamp1), (timestamp2), ...]
failures = {}

@router.post("/score")
async def score(request: Request):
    data = await request.json()
    ip  = data.get("client_ip")
    auth = data.get("auth_result", "").lower()

    # record attempt
    ATTEMPTS.labels(ip=ip).inc()
    now = time.time()
    # keep only the last 60s of failures
    failures.setdefault(ip, []).append(now)
    failures[ip] = [ts for ts in failures[ip] if now - ts < 60]

    # decide block: >5 fails in last minute
    if auth != "success" and len(failures[ip]) > 5:
        BLOCKED.labels(ip=ip).inc()
        raise HTTPException(status_code=403, detail="Blocked: too many failures")

    return {"status": "ok", "fails_last_minute": len(failures[ip])}

@router.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(data, media_type=CONTENT_TYPE_LATEST)
