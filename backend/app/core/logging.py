import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api_logger")
logging.basicConfig(level=logging.INFO)


class APILoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")
        if token:
            logger.info("%s %s Authorization=%s", request.method, request.url.path, token)
        else:
            logger.info("%s %s", request.method, request.url.path)
        response = await call_next(request)
        return response
