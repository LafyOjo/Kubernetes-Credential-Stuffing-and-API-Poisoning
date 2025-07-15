from fastapi import APIRouter, Depends

from app.core.metrics import get_user_counts
from app.api.dependencies import require_role

router = APIRouter(prefix="/api/user-calls", tags=["stats"])

@router.get("/", dependencies=[Depends(require_role("admin"))])
def read_user_calls():
    """Return total API call counts per user."""
    return get_user_counts()
