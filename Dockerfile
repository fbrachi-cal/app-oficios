FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required (optional, usually not needed for basic FastAPI)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use shell form to allow environment variable substitution, defaulting to 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
