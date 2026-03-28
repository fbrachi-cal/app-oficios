from typing import Optional
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.adapters.firebase.firebase_chat_repo import FirebaseChatRepository
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
from app.adapters.firebase.firebase_uploader import FirebaseUploader
from app.adapters.firebase.firebase_report_repo import FirebaseReportRepository
from app.domain.services.admin_service import AdminService
from app.domain.services.report_service import ReportService
from app.domain.services.admin_rating_service import AdminRatingService
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

def get_report_repo():
    return FirebaseReportRepository()

def get_admin_service():
    return AdminService(
        user_repository=FirebaseUserRepository(),
        chat_repository=FirebaseChatRepository(),
    )

def get_report_service():
    return ReportService(report_repository=FirebaseReportRepository())

def get_admin_rating_service():
    return AdminRatingService(
        rating_repo=FirebaseRatingRepository(),
        user_repo=FirebaseUserRepository()
    )

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