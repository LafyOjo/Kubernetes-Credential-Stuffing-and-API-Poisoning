# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.zero_trust import ZeroTrustMiddleware

from app.api.score import router as score_router
from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.config import router as config_router
from app.api.security import router as security_router

app = FastAPI(title="Credential-Stuffing Detector")

# DEVELOPMENT: allow your React dev server to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to cover everything
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enforce Zero Trust API key if configured
app.add_middleware(ZeroTrustMiddleware)

app.include_router(score_router)    # your /score endpoint
app.include_router(alerts_router)   # your /api/alerts endpoint
app.include_router(auth_router)     # /register, /login, /api/token
app.include_router(config_router)   # /config
app.include_router(security_router) # /api/security

@app.get("/ping")
def ping():
    return {"message": "pong"}
