from fastapi import APIRouter, HTTPException, Depends
import hashlib
import secrets
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.dependencies import get_current_active_user
from app.core.db import get_db
from app.models.security import SecurityState


router = APIRouter(prefix="/api/security", tags=["security"])


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _new_chain(prev: str | None = None) -> str:
    """Return a new chain value derived from ``prev`` and randomness."""
    seed = prev or settings.SECRET_KEY
    return _hash(seed + secrets.token_hex(8))


def get_state(db: Session) -> SecurityState:
    """Fetch the singleton ``SecurityState`` row, creating it if missing."""
    state = db.query(SecurityState).first()
    if state is None:
        state = SecurityState(security_enabled=True, current_chain=_new_chain())
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def init_chain(db: Session) -> None:
    """Initialise the chain value in the shared store."""
    state = get_state(db)
    state.current_chain = _new_chain()
    db.commit()


def rotate_chain(db: Session) -> None:
    """Advance the chain to the next value."""
    state = get_state(db)
    state.current_chain = _new_chain(state.current_chain)
    db.commit()


def verify_chain(token: str | None, db: Session) -> None:
    """Validate ``token`` matches the current chain and rotate."""
    state = get_state(db)
    if token != state.current_chain:
        raise HTTPException(status_code=401, detail="Invalid chain token")
    rotate_chain(db)


def is_enabled(db: Session) -> bool:
    return get_state(db).security_enabled


@router.get("/")
def get_security(_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Return current security enforcement state."""
    return {"enabled": get_state(db).security_enabled}


@router.get("/chain")
def get_chain(_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Retrieve the current chain value."""
    return {"chain": get_state(db).current_chain}


@router.post("/")
def set_security(payload: dict, _user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Update security enforcement state."""
    enabled = payload.get("enabled")
    if not isinstance(enabled, bool):
        raise HTTPException(status_code=422, detail="'enabled' boolean required")
    state = get_state(db)
    state.security_enabled = enabled
    if enabled:
        state.current_chain = _new_chain()
    else:
        state.current_chain = None
    db.commit()
    return {"enabled": state.security_enabled}
