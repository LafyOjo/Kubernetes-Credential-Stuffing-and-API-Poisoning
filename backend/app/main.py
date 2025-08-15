# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import os
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

# Import the database engine and Base from your db module
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

# --- FIX START ---
# Create the database tables on startup BEFORE adding middleware or routes.
# This ensures that any middleware that accesses the database will find the tables it needs.
Base.metadata.create_all(bind=engine)
# --- FIX END ---

app = FastAPI(title="APIShield+")

# Note: The duplicate app.add_middleware(PolicyEngineMiddleware) that was here has been removed.

@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    """Expose Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

allow_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log incoming requests and any presented Authorization headers
app.add_middleware(APILoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(AccessLogMiddleware)

# Enforce Zero Trust API key if configured
app.add_middleware(ZeroTrustMiddleware)
app.add_middleware(ReAuthMiddleware)
# Apply risk-based policy engine
app.add_middleware(PolicyEngineMiddleware)

# Optional ML-driven anomaly detection
if os.getenv("ANOMALY_DETECTION", "false").lower() == "true":
    app.add_middleware(AnomalyDetectionMiddleware)

app.include_router(score_router)      # your /score endpoint
app.include_router(alerts_router)     # your /api/alerts endpoint
app.include_router(auth_router)       # /register, /login, /api/token
app.include_router(config_router)     # /config
app.include_router(security_router)   # /api/security
app.include_router(user_stats_router) # /api/user-calls
app.include_router(events_router)     # /api/events
app.include_router(last_logins_router)  # /api/last-logins
app.include_router(access_logs_router)  # /api/access-logs
app.include_router(audit_router)      # /api/audit/log
app.include_router(auth_events_router)  # /events/auth
# app.include_router(credential_stuffing_router)  # /api/credential-stuffing-stats

@app.get("/ping")
def ping():
    return {"message": "pong"}
