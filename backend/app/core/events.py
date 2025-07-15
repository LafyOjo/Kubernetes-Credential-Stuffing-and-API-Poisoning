from sqlalchemy.orm import Session
from app.crud.events import create_event


def log_event(db: Session, username: str | None, action: str, success: bool) -> None:
    create_event(db, username, action, success)
