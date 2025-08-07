from fastapi import APIRouter, Depends

from app.core.metrics import get_user_counts
from app.api.dependencies import get_current_user, get_current_active_user

router = APIRouter(prefix="/api/user-calls", tags=["stats"])


@router.get("/")
def read_user_calls(_user=Depends(get_current_active_user)):
    """Return total API call counts per user."""
    return get_user_counts()


@router.get("/me")
def read_my_user_calls(current_user=Depends(get_current_user)):
    """Return API call count for the current user."""
    counts = get_user_counts()
    return {"count": counts.get(current_user.username, 0)}
