from time import monotonic
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram, Gauge
import psutil
from collections import defaultdict
from app.core.security import decode_access_token

REQUEST_LATENCY = Histogram(
    "api_request_latency_seconds",
    "Latency of API requests in seconds",
    ["method", "endpoint"],
)
REQUEST_LATENCY_MS = Histogram(
    "api_request_latency_milliseconds",
    "Latency of API requests in milliseconds",
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

CPU_PERCENT = Gauge("api_cpu_percent", "Process CPU usage percent")
MEM_BYTES = Gauge("api_memory_bytes", "Process memory usage in bytes")

_process = psutil.Process()

_user_counts: defaultdict[str, int] = defaultdict(int)


def increment_user(user: str) -> None:
    USER_REQUEST_COUNT.labels(user=user).inc()
    _user_counts[user] += 1


def get_user_counts() -> dict[str, int]:
    return dict(_user_counts)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = monotonic()
        response = await call_next(request)
        duration = monotonic() - start
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        REQUEST_LATENCY_MS.labels(request.method, request.url.path).observe(duration * 1000)
        REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()

        # update process resource usage
        CPU_PERCENT.set(_process.cpu_percent())
        MEM_BYTES.set(_process.memory_info().rss)

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
