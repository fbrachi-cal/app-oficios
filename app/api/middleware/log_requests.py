import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.shared.logger import log, request_id_var
from app.shared.firebase_auth import verify_token
from fastapi.security import HTTPBearer
from fastapi.security import HTTPAuthorizationCredentials

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate or extract X-Correlation-ID
        corr_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request_id_var.set(corr_id)

        start_time = time.time()

        # Intentar obtener el UID desde el token (si hay)
        uid = "-"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                # Avoid calling await HTTPBearer()(request) which might raise 403 on missing token
                auth_credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
                user_data = verify_token(auth_credentials=auth_credentials)
                uid = user_data.get("uid", "-")
            except Exception:
                uid = "anon"

        with log.contextualize(uid=uid, method=request.method, path=request.url.path):
            log.info("Request started")
            try:
                response = await call_next(request)
                duration = round(time.time() - start_time, 4)
                
                log.info(f"Request completed | status={response.status_code} | duration={duration}s")
                
                response.headers["X-Correlation-ID"] = corr_id
                return response
            except Exception as e:
                duration = round(time.time() - start_time, 4)
                log.exception(f"Unhandled exception during request processing | duration={duration}s")
                raise e
