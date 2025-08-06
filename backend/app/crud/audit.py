from typing import List

from sqlalchemy.orm import Session

from app.models.audit_logs import AuditLog


def create_audit_log(db: Session, username: str, event: str) -> AuditLog:
    log = AuditLog(username=username, event=event)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_all_activity_for_user(db: Session, username: str) -> List[AuditLog]:
    """Return all audit logs for the specified username."""
    return (
        db.query(AuditLog)
        .filter(AuditLog.username == username)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
