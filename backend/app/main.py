# app/main.py
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import os
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from app.core.zero_trust import ZeroTrustMiddleware
from app.core.logging import APILoggingMiddleware
from app.core.anomaly import AnomalyDetectionMiddleware
from app.core.policy import PolicyEngineMiddleware
from app.core.metrics import MetricsMiddleware

from app.api.score import router as score_router
from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.config import router as config_router
from app.api.security import router as security_router

app = FastAPI(title="APIShield+")

# DEVELOPMENT: allow your React dev server to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to cover everything
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log incoming requests and any presented Authorization headers
app.add_middleware(APILoggingMiddleware)
app.add_middleware(MetricsMiddleware)

# Enforce Zero Trust API key if configured
app.add_middleware(ZeroTrustMiddleware)
# Apply risk-based policy engine
app.add_middleware(PolicyEngineMiddleware)

# Optional ML-driven anomaly detection
if os.getenv("ANOMALY_DETECTION", "false").lower() == "true":
    app.add_middleware(AnomalyDetectionMiddleware)

app.include_router(score_router)    # your /score endpoint
app.include_router(alerts_router)   # your /api/alerts endpoint
app.include_router(auth_router)     # /register, /login, /api/token
app.include_router(config_router)   # /config
app.include_router(security_router) # /api/security

@app.get("/ping")
def ping():
    return {"message": "pong"}


@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

