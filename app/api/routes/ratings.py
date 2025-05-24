from fastapi import APIRouter, Depends, HTTPException
from app.ports.rating_repository import RatingRepository
from app.ports.user_repository import UserRepository
from app.domain.services.rating_service import RatingService
from app.api.schemas.rating_schema import RatingRequest
from app.api.dependencies import get_current_user_id, get_calificacion_repo, get_request_repo, get_user_repo
from app.ports.request_repository import RequestRepository
from app.shared.logger import log


router = APIRouter(prefix="/calificaciones", tags=["calificaciones"])

@router.post("/")
def calificar_usuario(
    payload: RatingRequest,
    user_id: str = Depends(get_current_user_id),
    repo: RatingRepository = Depends(get_calificacion_repo),
    request_repo: RequestRepository = Depends(get_request_repo),
    user_repo: UserRepository = Depends(get_user_repo)
):
    log.info("Calificar usuario")
    try:
        service = RatingService(repo, request_repo, user_repo)
        
        return service.calificar_usuario(
            solicitud_id=payload.solicitud_id,
            calificador_id=user_id,
            calificado_id=payload.calificado_id,
            calificacion=payload.calificacion,
            observacion=payload.observacion,
        )
    except Exception as e:
        log.error(f"Error al calificar usuario: {e}")
        raise HTTPException(status_code=400, detail=str(e))
