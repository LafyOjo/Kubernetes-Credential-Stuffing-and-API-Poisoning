# app/api/config.py
from fastapi import APIRouter
import os

from app.api.score import DEFAULT_FAIL_LIMIT

router = APIRouter(tags=["config"])


@router.get("/config")
def get_config():
    """Return the current FAIL_LIMIT configuration value."""
    fail_limit = int(os.getenv("FAIL_LIMIT", DEFAULT_FAIL_LIMIT))
    return {"fail_limit": fail_limit}
