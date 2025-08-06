# app/main.py
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import os
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .core.db import engine # Import the engine from your db setup
from . import models # Import your models

from app.core.zero_trust import ZeroTrustMiddleware
from app.core.logging import APILoggingMiddleware
from app.core.access_log import AccessLogMiddleware
from app.core.anomaly import AnomalyDetectionMiddleware, load_model
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
from app.api.policies import router as policies_router
from app.api.demo_shop_sim import router as demo_shop_sim_router

app = FastAPI(title="APIShield+")

# Permit requests from local development frontends
default_origins = [
    "http://127.0.0.1:8001",  # API itself
    "http://127.0.0.1:3000",  # React dashboard
    "http://127.0.0.1:3005",  # Demo-shop UI
    "http://localhost:8001",  # API itself (localhost)
    "http://localhost:3000",  # React dashboard (localhost)
    "http://localhost:3005",  # Demo-shop UI (localhost)
]

# Optionally override via ALLOW_ORIGINS env var (comma-separated)
allow_origins_env = os.getenv("ALLOW_ORIGINS")
if allow_origins_env:
    allow_origins = [origin.strip() for origin in allow_origins_env.split(",") if origin.strip()]
else:
    allow_origins = default_origins

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

    @app.on_event("startup")
    async def init_anomaly_model() -> None:
        load_model(app)

app.include_router(score_router)    # your /score endpoint
app.include_router(alerts_router)   # your /api/alerts endpoint
app.include_router(auth_router)     # /register, /login, /api/token
app.include_router(config_router)   # /config
app.include_router(security_router)  # /api/security
app.include_router(user_stats_router)  # /api/user-calls
app.include_router(events_router)   # /api/events
app.include_router(last_logins_router)  # /api/last-logins
app.include_router(access_logs_router)  # /api/access-logs
app.include_router(audit_router)  # /api/audit/log
app.include_router(policies_router)  # /api/policies and assignments
app.include_router(demo_shop_sim_router)


@app.get("/ping")
def ping():
    return {"message": "pong"}


@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
