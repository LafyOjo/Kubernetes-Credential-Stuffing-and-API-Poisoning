from sqlalchemy.orm import Session

from app.models.auth_events import AuthEvent


def create_auth_event(
    db: Session, user: str | None, action: str, success: bool, source: str
) -> AuthEvent:
    event = AuthEvent(user=user, action=action, success=success, source=source)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_auth_events(db: Session, limit: int = 50, offset: int = 0) -> list[AuthEvent]:
    return (
        db.query(AuthEvent)
        .order_by(AuthEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
