from fastapi import APIRouter, HTTPException, Depends
import hashlib
import secrets

from app.core.config import settings
from app.api.dependencies import require_role

# Global flag controlling credential stuffing enforcement
SECURITY_ENABLED = True

# Automatically revoke a user's token when credential stuffing is detected
AUTO_LOGOUT_ON_COMPROMISE = False

# Password chain used when SECURITY_ENABLED is True. Each API call must present
# the current value which is then rotated. This helps detect replayed or stale
# requests.
CURRENT_CHAIN = None


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _new_chain(prev: str | None = None) -> str:
    """Return a new chain value derived from ``prev`` and randomness."""
    seed = prev or settings.SECRET_KEY
    return _hash(seed + secrets.token_hex(8))


def init_chain() -> None:
    """Initialise the global chain value."""
    global CURRENT_CHAIN
    CURRENT_CHAIN = _new_chain()


def rotate_chain() -> None:
    """Advance the chain to the next value."""
    global CURRENT_CHAIN
    CURRENT_CHAIN = _new_chain(CURRENT_CHAIN)


def verify_chain(token: str | None) -> None:
    """Validate ``token`` matches the current chain and rotate."""
    if token != CURRENT_CHAIN:
        raise HTTPException(status_code=401, detail="Invalid chain token")
    rotate_chain()


# initialise chain on import so it's ready when the app starts
init_chain()

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/")
def get_security(_user=Depends(require_role("admin"))):
    """Return current security enforcement state."""
    return {
        "enabled": SECURITY_ENABLED,
        "logout_on_compromise": AUTO_LOGOUT_ON_COMPROMISE,
    }


@router.get("/chain")
def get_chain(_user=Depends(require_role("admin"))):
    """Retrieve the current chain value."""
    return {"chain": CURRENT_CHAIN}


@router.post("/")
def set_security(payload: dict, _user=Depends(require_role("admin"))):
    """Update security enforcement state."""

    enabled = payload.get("enabled")
    logout = payload.get("logout_on_compromise")

    global SECURITY_ENABLED, AUTO_LOGOUT_ON_COMPROMISE

    if enabled is not None:
        if not isinstance(enabled, bool):
            raise HTTPException(status_code=422, detail="'enabled' boolean required")
        SECURITY_ENABLED = enabled
        if enabled:
            init_chain()
        else:
            # Clear chain when security disabled
            global CURRENT_CHAIN
            CURRENT_CHAIN = None

    if logout is not None:
        if not isinstance(logout, bool):
            raise HTTPException(
                status_code=422, detail="'logout_on_compromise' boolean required"
            )
        AUTO_LOGOUT_ON_COMPROMISE = logout

    return {
        "enabled": SECURITY_ENABLED,
        "logout_on_compromise": AUTO_LOGOUT_ON_COMPROMISE,
    }
