# app/api/config.py
from fastapi import APIRouter, Depends
import os

from app.api.score import DEFAULT_FAIL_LIMIT
from app.api.dependencies import require_role

router = APIRouter(tags=["config"])


@router.get("/config")
def get_config(_user=Depends(require_role("admin"))):
    """Return the current FAIL_LIMIT configuration value."""
    fail_limit = int(os.getenv("FAIL_LIMIT", DEFAULT_FAIL_LIMIT))
    return {"fail_limit": fail_limit}
