from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.access_logs import AccessLog


def create_access_log(db: Session, username: str | None, path: str) -> AccessLog:
    log = AccessLog(username=username, path=path)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_access_logs(
    db: Session, username: str | None = None, hours: int | None = None
) -> list[AccessLog]:
    query = db.query(AccessLog)
    if username is not None:
        query = query.filter(AccessLog.username == username)
    if hours is not None:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(AccessLog.timestamp >= since)
    return query.order_by(AccessLog.timestamp.desc()).all()
