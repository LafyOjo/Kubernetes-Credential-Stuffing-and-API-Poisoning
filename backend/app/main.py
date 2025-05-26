from fastapi import FastAPI
from app.api.score import router as score_router

app = FastAPI(title="Detector Side-Car")

app.include_router(score_router)
