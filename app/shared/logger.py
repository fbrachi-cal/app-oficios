from loguru import logger
import sys

logger.remove()  # Eliminar el logger por defecto
logger.add(sys.stdout, level="INFO", colorize=True, backtrace=True, diagnose=True)
logger.add("logs/app.log", rotation="1 week", retention="1 month", level="DEBUG")

# Exportá logger para usar en toda la app
log = logger
