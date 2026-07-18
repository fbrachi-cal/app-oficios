from fastapi import APIRouter, Depends, HTTPException
from app.ports.rating_repository import RatingRepository
from app.ports.user_repository import UserRepository
from app.domain.services.rating_service import RatingService
from app.api.schemas.rating_schema import RatingRequest
from app.api.dependencies import get_current_user_id, get_calificacion_repo, get_request_repo, get_user_repo, get_notification_service
from app.ports.request_repository import RequestRepository
from app.shared.logger import log
from app.domain.services.notification_service import NotificationService


router = APIRouter(prefix="/calificaciones", tags=["calificaciones"])

@router.post("/")
async def calificar_usuario(
    payload: RatingRequest,
    user_id: str = Depends(get_current_user_id),
    repo: RatingRepository = Depends(get_calificacion_repo),
    request_repo: RequestRepository = Depends(get_request_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service)
):
    log.info("Calificar usuario")
    try:
        service = RatingService(repo, request_repo, user_repo)
        
        res = service.calificar_usuario(
            solicitud_id=payload.solicitud_id,
            calificador_id=user_id,
            calificado_id=payload.calificado_id,
            calificacion=payload.calificacion,
            observacion=payload.observacion,
        )
        
        try:
            solicitud = request_repo.get_by_id(payload.solicitud_id)
            if solicitud:
                calificado_id = payload.calificado_id
                if not calificado_id:
                    if user_id == solicitud["solicitante_id"]:
                        calificado_id = solicitud["profesional_id"]
                    else:
                        calificado_id = solicitud["solicitante_id"]
                        
                sender = user_repo.get_user_by_id(user_id)
                sender_name = sender.get("nombre", "Un usuario") if sender else "Un usuario"
                
                await notification_service.create_and_send_notification(
                    recipient_uid=calificado_id,
                    actor_uid=user_id,
                    type="rating_received",
                    title="Nueva calificación recibida",
                    body=f"{sender_name} te ha calificado por el trabajo de {solicitud.get('subcategoria')}.",
                    related_entity_type="request",
                    related_entity_id=payload.solicitud_id
                )
        except Exception as notif_err:
            log.error(f"Error sending rating notification: {notif_err}")
            
        return res
    except Exception as e:
        log.error(f"Error al calificar usuario: {e}")
        raise HTTPException(status_code=400, detail=str(e))

