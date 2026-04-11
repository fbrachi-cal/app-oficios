import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from app.shared.logger import log


load_dotenv()

# Inicializar Firebase Admin si no está iniciado
if not firebase_admin._apps:
    options = {"storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET")}
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    
    if private_key:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": private_key.replace('\\n', '\n'),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
            "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),        
        })
        firebase_admin.initialize_app(cred, options)
    else:
        firebase_admin.initialize_app(options=options)

security = HTTPBearer()

def verify_token(auth_credentials: HTTPAuthorizationCredentials = Security(security)):
    log.info("🔐 Verificando token...")
    try:
        id_token = auth_credentials.credentials
        log.info(f"🔐 Verificando token... {id_token}")
        decoded_token = auth.verify_id_token(id_token)
        log.info(f"✅ Token válido. UID: {decoded_token.get('uid')}")
        return decoded_token
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
