from sqlalchemy.orm import Session
from app.models.users import User


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def create_user(
    db: Session,
    username: str,
    password_hash: str,
    role: str = "user",
    policy_id: int | None = None,
) -> User:
    user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        policy_id=policy_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
