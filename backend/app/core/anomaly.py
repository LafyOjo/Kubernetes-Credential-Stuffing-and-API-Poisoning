import os
from threading import Lock
from fastapi import Request, FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    import numpy as np
except Exception:  # pragma: no cover - library may not be installed for tests
    IsolationForest = None  # type: ignore
    LocalOutlierFactor = None  # type: ignore
    np = None  # type: ignore


class _Model:
    def __init__(self, algo: str) -> None:
        # Train a simple model on synthetic normal data
        rng = np.random.default_rng(42)
        X = rng.uniform(low=[1], high=[20], size=(100, 1))

        if algo == "lof" and LocalOutlierFactor is not None:
            # LocalOutlierFactor requires novelty=True for predictions
            self.model = LocalOutlierFactor(novelty=True, contamination=0.05)
            self.model.fit(X)
        else:
            self.model = IsolationForest(contamination=0.05, random_state=42)
            self.model.fit(X)

    def score(self, value: float) -> int:
        return int(self.model.predict([[value]])[0])


_model_lock = Lock()


def load_model(app: FastAPI) -> _Model | None:
    """Create and store the anomaly model on ``app.state`` if needed."""
    if IsolationForest is None:
        return None
    model = getattr(app.state, "anomaly_model", None)
    if model is None:
        with _model_lock:
            model = getattr(app.state, "anomaly_model", None)
            if model is None:
                algo = os.getenv("ANOMALY_MODEL", "isolation_forest").lower()
                model = _Model(algo)
                app.state.anomaly_model = model
    return model


def get_model(request: Request) -> _Model | None:
    """Retrieve the model from ``request.app.state``."""
    return load_model(request.app)


class AnomalyDetectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if IsolationForest is None or np is None:
            return await call_next(request)
        model = get_model(request)
        if model is None:
            return await call_next(request)
        path_len = len(request.url.path)
        if model.score(path_len) == -1:
            return JSONResponse({"detail": "Anomalous request"}, status_code=HTTP_403_FORBIDDEN)
        return await call_next(request)
