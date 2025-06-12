# backend/app/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Your database URL, e.g. sqlite:///./app.db
    DATABASE_URL: str

    class Config:
        # automatically load a “.env” file from your project root
        env_file = ".env"
        env_file_encoding = "utf-8"
        SECRET_KEY: str = "CHANGE_THIS_TO_A_RANDOM_SECRET"
        ALGORITHM: str  = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

settings = Settings()