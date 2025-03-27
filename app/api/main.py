import os
from fastapi import FastAPI
from app.api.routes import users, requests, ratings
from app.api.middleware.log_requests import LoggingMiddleware
from app.shared.logger import log

print("APP DE OFICIOS - API")
print("ENABLE_LOGGING:", os.getenv("ENABLE_LOGGING", "true"))
log.info("APP INICIADA - API")
app = FastAPI(title="App de Oficios - API")

if os.getenv("ENABLE_LOGGING", "true") == "true":
    app.add_middleware(LoggingMiddleware)


app.include_router(users.router, prefix="/usuarios", tags=["Usuarios"])
app.include_router(requests.router, prefix="/solicitudes", tags=["Solicitudes"])
app.include_router(ratings.router, prefix="/calificaciones", tags=["Calificaciones"])
