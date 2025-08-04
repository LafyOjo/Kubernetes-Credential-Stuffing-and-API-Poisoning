from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.events import log_event

router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditLog(BaseModel):
    event: str
    username: str | None = None
    success: bool = True


@router.post("/log")
def audit_log(log: AuditLog, db: Session = Depends(get_db)):
    """Record an audit event from a frontend."""
    log_event(db, log.username, log.event, log.success)
    return {"status": "logged"}
