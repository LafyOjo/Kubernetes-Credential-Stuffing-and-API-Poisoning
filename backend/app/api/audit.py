from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud.audit import create_audit_log
from app.schemas.audit import AuditLogCreate

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.post("/log")
def audit_log(log: AuditLogCreate, db: Session = Depends(get_db)):
    """Record an audit event from a frontend."""
    create_audit_log(db, log.username, log.event)
    return {"status": "logged"}
