from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogCreate(BaseModel):
    event: str
    username: Optional[str] = None


class AuditLogRead(AuditLogCreate):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True
