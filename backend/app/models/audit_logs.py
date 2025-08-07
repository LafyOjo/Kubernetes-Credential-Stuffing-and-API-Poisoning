"""SQLAlchemy model for storing audit log entries."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime

from app.core.db import Base


class AuditLog(Base):
    """Record of an event triggered by a user for auditing purposes."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, index=True)
    event = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
