from sqlalchemy import func
from sqlalchemy.sql import ColumnElement


def bucket_time(column: ColumnElement, dialect_name: str, interval: str = "minute"):
    """Return expression that truncates *column* to a time bucket.

    Currently supports minute-level bucketing. Uses SQLite's strftime when the
    active dialect is SQLite and ``date_trunc`` otherwise (e.g., PostgreSQL).
    """
    if interval != "minute":
        raise ValueError("Only minute interval is supported")
    if dialect_name == "sqlite":
        return func.strftime("%Y-%m-%d %H:%M:00", column)
    return func.date_trunc("minute", column)
