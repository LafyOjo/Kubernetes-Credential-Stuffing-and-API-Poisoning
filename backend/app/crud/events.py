from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.events import Event


def create_event(db: Session, username: str | None, action: str, success: bool) -> Event:
    event = Event(username=username, action=action, success=success)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_events(db: Session, hours: int | None = None) -> list[Event]:
    query = db.query(Event)
    if hours is not None:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(Event.timestamp >= since)
    return query.order_by(Event.timestamp.desc()).all()


def get_last_logins(db: Session) -> dict[str, datetime]:
    rows = (
        db.query(Event.username, func.max(Event.timestamp))
        .filter(Event.action == "login", Event.success.is_(True))
        .group_by(Event.username)
        .all()
    )
    return {u: ts for u, ts in rows if u is not None}


def get_user_activity(
    db: Session,
    username: str,
    limit: int = 15,
    action: str | None = "login",
) -> list[Event]:
    """Return up to ``limit`` most recent events for ``username``.

    By default only ``login`` events are returned. Pass ``action=None`` to
    include events of all types.
    """

    query = db.query(Event).filter(Event.username == username)
    if action is not None:
        query = query.filter(Event.action == action)
    return (
        query.order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )
