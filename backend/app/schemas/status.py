from typing import Optional
from pydantic import BaseModel


class AccountStatus(BaseModel):
    """Schema for returning the status of a demo account."""
    username: str
    fail_limit: Optional[int]
    fail_window_seconds: Optional[int]

    class Config:
        orm_mode = True