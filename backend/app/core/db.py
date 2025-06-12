# backend/app/core/db.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import Settings

# pull your DATABASE_URL from settings
settings = Settings()

# create SQLAlchemy engine
engine = create_engine(settings.DATABASE_URL, echo=True, future=True)

# session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# base class for models
Base = declarative_base()

def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy Session,
    then closes it once the request is over.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
