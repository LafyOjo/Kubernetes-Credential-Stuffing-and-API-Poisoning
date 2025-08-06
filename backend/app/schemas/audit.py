from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class AuditEventType(str, Enum):
    """Allowed audit events for user actions."""

    user_login_success = "user_login_success"
    user_login_failure = "user_login_failure"
    user_logout = "user_logout"
    user_register = "user_register"


class AuditLogCreate(BaseModel):
    event: AuditEventType
    username: str  # required


class AuditLogRead(AuditLogCreate):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True
