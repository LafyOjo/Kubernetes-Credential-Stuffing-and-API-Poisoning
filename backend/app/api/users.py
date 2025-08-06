from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.db import get_db
from app.api.dependencies import get_current_user
from app.crud.events import get_user_activity
from app.crud.users import get_user_by_username
from app.crud.policies import get_policy_by_id
from app.schemas.events import EventRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{username}/activity", response_model=list[EventRead])
def user_activity(
    username: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return get_user_activity(db, username)


class SecurityProfile(BaseModel):
    failed_attempts_limit: int
    mfa_required: bool
    geo_fencing_enabled: bool


@router.get("/{username}/security-profile", response_model=SecurityProfile)
def user_security_profile(
    username: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    user = get_user_by_username(db, username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.policy_id is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy = get_policy_by_id(db, user.policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    return SecurityProfile(
        failed_attempts_limit=policy.failed_attempts_limit,
        mfa_required=policy.mfa_required,
        geo_fencing_enabled=policy.geo_fencing_enabled,
    )
