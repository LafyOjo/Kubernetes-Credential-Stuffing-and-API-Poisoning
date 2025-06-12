# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.score import router as score_router
from app.api.alerts import router as alerts_router

app = FastAPI(title="Credential-Stuffing Detector")

# DEVELOPMENT: allow your React dev server to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to cover everything
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score_router)    # your /score endpoint
app.include_router(alerts_router)   # your /api/alerts endpoint

@app.get("/ping")
def ping():
    return {"message": "pong"}
