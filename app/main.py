import os
from fastapi import FastAPI
from app.api.routes import users, requests, ratings, utils, contacts, chats, requests, upload
from app.api.middleware.log_requests import LoggingMiddleware
from app.shared.logger import log
from fastapi.middleware.cors import CORSMiddleware




print("APP DE OFICIOS - API")
print("ENABLE_LOGGING:", os.getenv("ENABLE_LOGGING", "true"))
log.info("APP INICIADA - API")

app = FastAPI(title="App de Oficios - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # o ["*"] para desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.getenv("ENABLE_LOGGING", "true") == "true":
    app.add_middleware(LoggingMiddleware)


app.include_router(requests.router, prefix="/solicitudes", tags=["Solicitudes"])
app.include_router(users.router, prefix="/usuarios", tags=["Usuarios"])
app.include_router(contacts.router, prefix="/contactos", tags=["contactos"])
app.include_router(utils.router)
app.include_router(chats.router)
app.include_router(requests.router)
app.include_router(upload.router)
app.include_router(ratings.router)


