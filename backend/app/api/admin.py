from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_role
from app.core.db import get_db
from app.core.security import get_password_hash
from app.core.account_security import calculate_security_score
from app.crud.users import (
    get_user_by_username,
    create_user,
    delete_user,
)
from app.schemas.users import UserCreate, UserRead

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserRead, dependencies=[Depends(require_role("admin"))])
def admin_create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = get_password_hash(user_in.password)
    score = calculate_security_score(
        user_in.password,
        two_factor=user_in.two_factor,
        security_question=user_in.security_question,
    )
    role = user_in.role or "user"
    user = create_user(
        db,
        username=user_in.username,
        password_hash=hashed,
        role=role,
        security_score=score,
    )
    return user


@router.delete("/users/{username}", dependencies=[Depends(require_role("admin"))])
def admin_delete_user(username: str, db: Session = Depends(get_db)):
    if not delete_user(db, username):
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User deleted"}
