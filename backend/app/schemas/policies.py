from pydantic import BaseModel


class PolicyCreate(BaseModel):
    failed_attempts_limit: int
    mfa_required: bool = False
    geo_fencing_enabled: bool = False


class PolicyRead(PolicyCreate):
    id: int

    class Config:
        orm_mode = True
