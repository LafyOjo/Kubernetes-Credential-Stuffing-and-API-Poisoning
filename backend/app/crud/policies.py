from sqlalchemy.orm import Session
from app.models.policies import Policy
from app.models.users import User


def get_policy_by_id(db: Session, policy_id: int) -> Policy | None:
    return db.query(Policy).filter(Policy.id == policy_id).first()


def create_policy(
    db: Session,
    *,
    failed_attempts_limit: int,
    mfa_required: bool = False,
    geo_fencing_enabled: bool = False,
) -> Policy:
    policy = Policy(
        failed_attempts_limit=failed_attempts_limit,
        mfa_required=mfa_required,
        geo_fencing_enabled=geo_fencing_enabled,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def get_policy_for_user(db: Session, user: User) -> Policy | None:
    if user.policy_id is None:
        return None
    return get_policy_by_id(db, user.policy_id)
