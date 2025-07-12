from time import monotonic
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram

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

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = monotonic()
        response = await call_next(request)
        duration = monotonic() - start
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
        return response
