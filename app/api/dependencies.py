from typing import Optional
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.adapters.firebase.firebase_chat_repo import FirebaseChatRepository
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
from app.adapters.firebase.firebase_uploader import FirebaseUploader
from fastapi import Header, HTTPException
from firebase_admin import auth
from app.shared.logger import log


def get_calificacion_repo():
    return FirebaseRatingRepository()

def get_chat_repo():
    return FirebaseChatRepository()

def get_user_repo():
    return FirebaseUserRepository()

def get_request_repo():
    return FirebaseRequestRepository()

def get_file_uploader():
    return FirebaseUploader()

#async def get_current_user_id(authorization: str = Header(...)) -> str:    
async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.split(" ")[1]
    
    log.info(f"authorization: {authorization}")
    
    try:
        decoded_token = auth.verify_id_token(token)
        log.info(f"decoded token {decoded_token}")
        return decoded_token["uid"]
    except Exception as e:
        log.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Firebase token")