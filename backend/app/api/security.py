from fastapi import APIRouter, HTTPException

# Global flag controlling credential stuffing enforcement
SECURITY_ENABLED = True

router = APIRouter(prefix="/api/security", tags=["security"])

@router.get("/")
def get_security():
    """Return current security enforcement state."""
    return {"enabled": SECURITY_ENABLED}

@router.post("/")
def set_security(payload: dict):
    """Update security enforcement state."""
    enabled = payload.get("enabled")
    if not isinstance(enabled, bool):
        raise HTTPException(status_code=422, detail="'enabled' boolean required")
    global SECURITY_ENABLED
    SECURITY_ENABLED = enabled
    return {"enabled": SECURITY_ENABLED}
