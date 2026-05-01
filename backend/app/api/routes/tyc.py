from fastapi import APIRouter
from app.domain.services.tyc_service import TycService

router = APIRouter()

@router.get("/current")
def get_current_tyc():
    return TycService.get_current_terms()
