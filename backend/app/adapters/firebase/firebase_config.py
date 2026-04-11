import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from app.shared.logger import log

# Cargar las variables de entorno desde .env
load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        log.info(f"project_id: {os.getenv('FIREBASE_PROJECT_ID')}")
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
                "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
            })
            firebase_admin.initialize_app(cred, options)
        else:
            firebase_admin.initialize_app(options=options)

def get_firestore():
    init_firebase()
    return firestore.client()
