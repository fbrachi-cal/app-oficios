from loguru import logger
import sys

import os

logger.remove()  # Eliminar el logger por defecto
logger.add(sys.stdout, level="INFO", colorize=True, backtrace=True, diagnose=True)

if os.getenv("LOG_TO_FILE", "false").lower() == "true":
    os.makedirs("logs", exist_ok=True)
    logger.add("logs/app.log", rotation="1 week", retention="1 month", level="DEBUG")

# Exportá logger para usar en toda la app
log = logger
