from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    role: str | None = None
    two_factor: bool = False
    security_question: bool = False


class UserRead(BaseModel):
    id: int
    username: str
    role: str
    security_score: int

    class Config:
        orm_mode = True
