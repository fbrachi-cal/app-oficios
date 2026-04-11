from loguru import logger
import sys
import os
import contextvars

# Context variable for the UUID of the request
request_id_var = contextvars.ContextVar("request_id", default="-")

def request_id_filter(record):
    record["extra"]["request_id"] = request_id_var.get()
    return True

logger.remove()  # Eliminar el logger por defecto

is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"

logger.add(
    sys.stdout,
    level="INFO",
    serialize=is_prod,
    colorize=not is_prod,
    backtrace=True,
    diagnose=True,
    filter=request_id_filter
)

if os.getenv("LOG_TO_FILE", "false").lower() == "true":
    os.makedirs("logs", exist_ok=True)
    logger.add("logs/app.log", rotation="1 week", retention="1 month", level="DEBUG", serialize=is_prod, filter=request_id_filter)

# Exportá logger para usar en toda la app
log = logger
