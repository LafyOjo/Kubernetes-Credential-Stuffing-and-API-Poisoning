# backend/app/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Your database URL, e.g. sqlite:///./app.db
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OIDC_ISSUER: str = "https://keycloak.example.com/realms/demo"
    OIDC_AUDIENCE: str = "demo-api"
    FAIL_LIMIT: int = 5
    FAIL_WINDOW_SECONDS: int = 60
    DB_ECHO: bool = False
    REGISTER_WITH_DEMOSHOP: bool = False
    LOGIN_WITH_DEMOSHOP: bool = False
    DEMO_SHOP_URL: str = "http://localhost:8001"
    ANOMALY_DETECTION: bool = False
    ANOMALY_MODEL: str = "lof"
    REAUTH_PER_REQUEST: bool = False
    ZERO_TRUST_API_KEY: str = "demo-key"

    class Config:
        # automatically load a “.env” file from your project root
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
