# backend/app/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Your database URL, e.g. sqlite:///./app.db
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        # automatically load a “.env” file from your project root
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()