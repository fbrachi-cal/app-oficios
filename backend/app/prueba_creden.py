import os
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv

# Cargar las variables de entorno desde .env
load_dotenv()


cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
            "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
        })
firebase_admin.initialize_app(cred)

token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5MWYxNWRlZTg0OTUzNjZjOTgyZTA1MTMzYmNhOGYyNDg5ZWFjNzIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiRmVkZXJpY28gQnJhY2hpIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0xwanpQd0RjVHRIWU12OEUweGgyR0pfazBxbWJ6UUpVOWFFZ3lWV1h1eDZZSVpCYnE5PXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2FwcC1vZmljaW9zLWZmYzM1IiwiYXVkIjoiYXBwLW9maWNpb3MtZmZjMzUiLCJhdXRoX3RpbWUiOjE3NDY3MjUwMjAsInVzZXJfaWQiOiJqUm1XWFVVMERnaEhoWEJyUHVxZmF6T2xueGgyIiwic3ViIjoialJtV1hVVTBEZ2hIaFhCclB1cWZhek9sbnhoMiIsImlhdCI6MTc0NjcyNTAzNCwiZXhwIjoxNzQ2NzI4NjM0LCJlbWFpbCI6ImZicmFjaGlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDMxMDU1NTExOTEzNjQ5NTA0MTUiXSwiZW1haWwiOlsiZmJyYWNoaUBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.xfkmcay8v0ILNy5BkHu2YMcXmSbbQWW8nxcNM5hTsqjWRKiRt3wk3xYsyzqHvw3mBMzGpNB1F17kW-ai7W5RIOduXUKGxPSr-yuD0Le3pkBG6rI5Y19GWM6h24m5pziuPos9VNUoE4esUdZ8xWB4HwHAiPd0IcyXfoBS18OTVEa7ujxIlaCdV80KD4f-TnzIGsUfACqjdQ5qpHBCsLMKKRcLHwff70ZYOIm0uHwbJ7kXXI-Q3VcCxaCVNX9kDqJ-CnDK-2aMVqujnqkuwcMfuMoZfYe6Bg1M9vdhjnCNFGK6qEZrzjixpQamgN3WxjAn5Soy75KEbcbX2VO34iyckg"

decoded = auth.verify_id_token(token)
print("Decoded:", decoded)
