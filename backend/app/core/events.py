"""Utility for recording notable actions in the event log.

Only a small subset of actions are considered "major" and therefore stored in
the database.  This helps keep the dashboard focused by ignoring the many
minor interactions that previously produced excessive rows.
"""

from sqlalchemy.orm import Session

from app.crud.events import create_event

# Actions that should result in a persisted event. Anything else passed to
# ``log_event`` will be quietly ignored.
MAJOR_EVENTS = {
    "login",
    "logout",
    "stuffing_attempt",
    "shop_login_error",
    "stuffing_block",
}


def log_event(db: Session, username: str | None, action: str, success: bool) -> None:
    """Persist an event if it is considered major."""
    if action not in MAJOR_EVENTS:
        return
    create_event(db, username, action, success)
