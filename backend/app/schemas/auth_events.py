from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuthEventCreate(BaseModel):
    user: Optional[str] = None
    action: str
    success: bool
    source: str


class AuthEventOut(BaseModel):
    id: int
    user: Optional[str]
    action: str
    success: bool
    source: str
    created_at: datetime

    class Config:
        from_attributes = True
