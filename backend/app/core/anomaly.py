from typing import Any
import os
from fastapi import Request
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


_model: Any = None


def get_model() -> _Model | None:
    global _model
    if _model is None and IsolationForest is not None:
        algo = os.getenv("ANOMALY_MODEL", "isolation_forest").lower()
        _model = _Model(algo)
    return _model


class AnomalyDetectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if IsolationForest is None or np is None:
            return await call_next(request)
        model = get_model()
        if model is None:
            return await call_next(request)
        path_len = len(request.url.path)
        if model.score(path_len) == -1:
            return JSONResponse({"detail": "Anomalous request"}, status_code=HTTP_403_FORBIDDEN)
        return await call_next(request)
