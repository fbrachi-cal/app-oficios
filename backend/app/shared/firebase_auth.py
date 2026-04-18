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

def parse_status_expires_at(expires_at):
    from datetime import datetime
    if not expires_at:
        return None
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except Exception:
            return None
    if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=None)
    if isinstance(expires_at, datetime):
        return expires_at
    return None

security = HTTPBearer()

def verify_token(auth_credentials: HTTPAuthorizationCredentials = Security(security)):
    log.info("🔐 Verificando token...")
    try:
        id_token = auth_credentials.credentials
        from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
        repo = FirebaseUserRepository()
        
        try:
            decoded_token = auth.verify_id_token(id_token, check_revoked=True)
            uid = decoded_token.get('uid')
        except auth.RevokedIdTokenError as e:
            # Token was revoked. Check if it's due to an expired suspension
            unverified_claims = auth.verify_id_token(id_token, check_revoked=False)
            uid = unverified_claims.get('uid')
            user = repo.get_user_by_id(uid)
            from datetime import datetime
            
            if user and user.get("status") == "SUSPENDED" and user.get("status_expires_at"):
                expires_at = parse_status_expires_at(user.get("status_expires_at"))
                if expires_at and datetime.utcnow() >= expires_at:
                    log.info(f"♻️ Suspensión expirada. Auto-reactivando usuario {uid}")
                    repo.actualizar_campos_usuario(uid, {"status": "ACTIVE", "status_expires_at": None})
                    auth.update_user(uid, disabled=False)
                    # We allow the request to proceed since the signature is valid
                    decoded_token = unverified_claims
                else:
                    raise e
            else:
                raise e
        except auth.UserDisabledError as e:
            unverified_claims = auth.verify_id_token(id_token, check_revoked=False)
            uid = unverified_claims.get('uid')
            user = repo.get_user_by_id(uid)
            from datetime import datetime
            if user and user.get("status") == "SUSPENDED" and user.get("status_expires_at"):
                expires_at = parse_status_expires_at(user.get("status_expires_at"))
                if expires_at and datetime.utcnow() >= expires_at:
                    log.info(f"♻️ Suspensión expirada. Auto-reactivando usuario {uid}")
                    repo.actualizar_campos_usuario(uid, {"status": "ACTIVE", "status_expires_at": None})
                    auth.update_user(uid, disabled=False)
                    decoded_token = unverified_claims
                else:
                    raise e
            else:
                raise e
        
        # Consultamos Firestore para validar el estado del usuario (en caso de que haya superado check_revoked)
        user = repo.get_user_by_id(uid)
        
        if user:
            status = user.get("status", "ACTIVE")
            if status == "SUSPENDED" and user.get("status_expires_at"):
                from datetime import datetime
                expires_at = parse_status_expires_at(user.get("status_expires_at"))
                if expires_at and datetime.utcnow() >= expires_at:
                    log.info(f"♻️ Suspensión expirada en chequeo DB. Auto-reactivando usuario {uid}")
                    repo.actualizar_campos_usuario(uid, {"status": "ACTIVE", "status_expires_at": None})
                    auth.update_user(uid, disabled=False)
                    status = "ACTIVE"
                    
            if status != "ACTIVE":
                reason = user.get("status_reason", "Sin motivo especificado")
                expires_at = user.get("status_expires_at")
                log.warning(f"Intento de acceso denegado. UID: {uid}, Estado: {status}")
                
                # Format expires_at safely
                expires_str = None
                if isinstance(expires_at, datetime):
                    expires_str = expires_at.isoformat()
                elif isinstance(expires_at, str):
                    expires_str = expires_at
                    
                # Inject a structured error so frontend can parse it
                raise HTTPException(status_code=403, detail={"status": status, "reason": reason, "expires_at": expires_str})
        
        log.info(f"✅ Token válido y usuario activo. UID: {uid}")
        return decoded_token
    except auth.ExpiredIdTokenError as e:
        log.warning(f"Token expirado: {e}")
        raise HTTPException(status_code=401, detail="Token expirado")
    except auth.InvalidIdTokenError as e:
        log.warning(f"Token inválido: {e}")
        raise HTTPException(status_code=401, detail="Token inválido")
    except HTTPException:
        # Re-lanzamos excepciones HTTP (como nuestro 403 o 401 preexistente)
        raise
    except Exception as e:
        log.error(f"Error inesperado procesando token: {e}")
        # Internal exceptions should bubble up as 500, not 401
        raise HTTPException(status_code=500, detail="Error de validación del lado de backend")
