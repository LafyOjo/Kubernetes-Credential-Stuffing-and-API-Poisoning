from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import os
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from app.core.db import Base, engine

from app.core.zero_trust import ZeroTrustMiddleware
from app.core.logging import APILoggingMiddleware
from app.core.access_log import AccessLogMiddleware
from app.core.anomaly import AnomalyDetectionMiddleware
from app.core.policy import PolicyEngineMiddleware
from app.core.metrics import MetricsMiddleware
from app.core.re_auth import ReAuthMiddleware

from app.api.score import router as score_router
from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.config import router as config_router
from app.api.security import router as security_router
from app.api.user_stats import router as user_stats_router
from app.api.events import router as events_router
from app.api.last_logins import router as last_logins_router
from app.api.access_logs import router as access_logs_router
from app.api.audit import router as audit_router
from app.api.auth_events import router as auth_events_router

# Create DB tables before any middlewares/routes might touch the DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="APIShield+")


# Observability/logging
app.add_middleware(APILoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(AccessLogMiddleware)

# Security layers
app.add_middleware(ZeroTrustMiddleware)   # requires X-API-Key when configured
app.add_middleware(ReAuthMiddleware)      # per-request password guard
app.add_middleware(PolicyEngineMiddleware)

# Optional anomaly detection
if os.getenv("ANOMALY_DETECTION", "false").lower() == "true":
    app.add_middleware(AnomalyDetectionMiddleware)

# Routers
app.include_router(score_router)            # /score
app.include_router(alerts_router)           # /api/alerts
app.include_router(auth_router)             # /register, /login, /api/token
app.include_router(config_router)           # /config
app.include_router(security_router)         # /api/security
app.include_router(user_stats_router)       # /api/user-calls
app.include_router(events_router)           # /api/events
app.include_router(last_logins_router)      # /api/last-logins
app.include_router(access_logs_router)      # /api/access-logs
app.include_router(audit_router)            # /api/audit/log
app.include_router(auth_events_router)      # /events/auth

# If your repo has credential_stuffing router, include it (safe optional import)
try:
    from app.api.credential_stuffing import router as credential_stuffing_router
    app.include_router(credential_stuffing_router)   # /api/credential-stuffing-stats
except Exception:
    pass

@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/ping")
def ping():
    return {"message": "pong"}

app.add_middleware(
    CORSMiddleware,
    # accept http or https, localhost or 127.0.0.1, any port
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    # keep a short explicit allowlist for anything not covered by the regex
    allow_origins=[
        "http://raspberrypi:3000",
        "http://raspberrypi.local:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],     # lets browser send Authorization, X-API-Key, X-Reauth-Password, etc.
    expose_headers=["*"],
    max_age=86400,           # cache preflights
)