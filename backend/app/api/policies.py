from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.api.dependencies import require_role
from app.crud.policies import create_policy, get_policy_by_id
from app.crud.users import get_user_by_username
from app.schemas.policies import PolicyCreate, PolicyRead

router = APIRouter(prefix="/api", tags=["policies"])


@router.post("/policies", response_model=PolicyRead)
def create_policy_endpoint(
    policy: PolicyCreate,
    _user=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    return create_policy(
        db,
        failed_attempts_limit=policy.failed_attempts_limit,
        mfa_required=policy.mfa_required,
        geo_fencing_enabled=policy.geo_fencing_enabled,
    )


@router.post("/users/{username}/policy/{policy_id}")
def assign_policy(
    username: str,
    policy_id: int,
    _user=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    policy = get_policy_by_id(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    user.policy_id = policy_id
    db.commit()
    return {"username": user.username, "policy_id": policy_id}
