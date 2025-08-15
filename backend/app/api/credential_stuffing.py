from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.auth_events import AuthEvent
from sqlalchemy import func

router = APIRouter()

@router.get("/api/credential-stuffing-stats")
def get_credential_stuffing_stats(db: Session = Depends(get_db)):
    """
    Returns the total and successful credential stuffing attempts for Alice and Ben.
    """
    users = ["alice", "ben"]
    stats = {}

    for user in users:
        total_attempts = db.query(AuthEvent).filter(AuthEvent.user == user).count()
        successful_attempts = db.query(AuthEvent).filter(AuthEvent.user == user, AuthEvent.success == True).count()
        stats[user] = {
            "total_attempts": total_attempts,
            "successful_attempts": successful_attempts,
        }

    return stats
