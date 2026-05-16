from fastapi import APIRouter, HTTPException, Depends
from app.api.schemas.professional_referrals_schema import ReferralCreate, ReferralOut
from app.api.dependencies import get_professional_referrals_service
from app.shared.firebase_auth import verify_token
from app.shared.roles import require_role
from app.domain.services.professional_referrals_service import ProfessionalReferralsService
from app.shared.logger import log

router = APIRouter()

@router.post("/", response_model=ReferralOut)
def create_referral(
    referral_data: ReferralCreate,
    user_data: dict = Depends(require_role("cliente")),
    service: ProfessionalReferralsService = Depends(get_professional_referrals_service)
):
    try:
        client_id = user_data["uid"]
        created = service.create_referral(client_id, referral_data.dict(exclude_unset=True))
        return created
    except ValueError as e:
        log.warning(f"Error al crear recomendación: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error(f"Error interno al crear recomendación: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
