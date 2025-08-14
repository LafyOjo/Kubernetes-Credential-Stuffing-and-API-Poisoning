from time import monotonic
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram
from collections import defaultdict
from app.core.security import decode_access_token

REQUEST_LATENCY = Histogram(
    "api_request_latency_seconds",
    "Latency of API requests in seconds",
    ["method", "endpoint"],
)
REQUEST_COUNT = Counter(
    "api_request_count_total",
    "Total API requests",
    ["method", "endpoint", "http_status"],
)

# Track API calls per authenticated user. The Prometheus counter exposes
# metrics while the dictionary keeps counts for the new `/api/user-calls`
# endpoint.
USER_REQUEST_COUNT = Counter(
    "api_user_request_total",
    "Total API requests per user",
    ["user"],
)

# Counter: total stuffing attempts, labeled by username
credential_stuffing_attempts = Counter(
    "credential_stuffing_attempts_total",
    "Number of credential stuffing attempts detected",
    ["username"],
)

_user_counts: defaultdict[str, int] = defaultdict(int)


def increment_user(user: str) -> None:
    USER_REQUEST_COUNT.labels(user=user).inc()
    _user_counts[user] += 1


def get_user_counts() -> dict[str, int]:
    return dict(_user_counts)


def record_stuffing_attempt(username: str) -> None:
    if not username:
        username = "unknown"
    credential_stuffing_attempts.labels(username=username).inc()


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = monotonic()
        response = await call_next(request)
        duration = monotonic() - start
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()

        user = "anonymous"
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split()[1]
            try:
                payload = decode_access_token(token)
                user = payload.get("sub", "unknown") or "unknown"
            except Exception:
                user = "unknown"
        increment_user(user)

        return response
