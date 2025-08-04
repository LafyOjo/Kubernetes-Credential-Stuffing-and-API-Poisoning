from sqlalchemy import Column, Integer, Boolean, String

from app.core.db import Base


class SecurityState(Base):
    """Singleton table storing security enable flag and chain value."""
    __tablename__ = "security_state"

    id = Column(Integer, primary_key=True, index=True)
    security_enabled = Column(Boolean, nullable=False, default=True)
    current_chain = Column(String, nullable=True)
