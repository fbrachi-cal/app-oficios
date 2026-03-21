import os
import sys

# Ensure this runs in the correct path
sys.path.insert(0, os.path.abspath("."))

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.get("/health")
print("STATUS:", response.status_code)
print("BODY:", response.json())
