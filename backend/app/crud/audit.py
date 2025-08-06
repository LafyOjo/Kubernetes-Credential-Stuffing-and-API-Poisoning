from sqlalchemy.orm import Session
from app.models.audit_logs import AuditLog


def create_audit_log(db: Session, username: str, event: str) -> AuditLog:
    log = AuditLog(username=username, event=event)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
