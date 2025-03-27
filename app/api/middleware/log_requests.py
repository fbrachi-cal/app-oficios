import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.shared.logger import log
from app.shared.firebase_auth import verify_token
from fastapi.security import HTTPBearer

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Intentar obtener el UID desde el token (si hay)
        uid = "-"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                auth_credentials = await HTTPBearer()(request)
                user_data = verify_token(auth_credentials=auth_credentials)
                uid = user_data["uid"]
            except Exception:
                uid = "anon"

        response = await call_next(request)
        duration = round(time.time() - start_time, 4)

        log.info(
            "[{method}] {path} | {status} | {duration}s | uid={uid}".format(
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration=duration,
                uid=uid,
            )
        )

        return response
