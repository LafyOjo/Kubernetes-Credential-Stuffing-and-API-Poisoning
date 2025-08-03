from sqlalchemy.orm import Session
from app.models.users import User


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def create_user(
    db: Session,
    *,
    username: str,
    password_hash: str,
    role: str = "user",
    security_score: int = 0,
) -> User:
    user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        security_score=security_score,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, username: str) -> bool:
    user = get_user_by_username(db, username)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True
