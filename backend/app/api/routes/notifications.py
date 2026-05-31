from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import List, Dict, Any
from app.api.dependencies import get_current_user_id, get_notification_service
from app.domain.services.notification_service import NotificationService
from app.shared.logger import log

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class FCMTokenPayload(BaseModel):
    token: str

@router.get("/me", response_model=List[Dict[str, Any]])
async def get_my_notifications(
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service)
):
    try:
        return service.get_user_notifications(user_id)
    except Exception as e:
        log.error(f"Error fetching notifications for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al recuperar notificaciones"
        )

@router.post("/{id}/read", response_model=Dict[str, Any])
async def read_notification(
    id: str,
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service)
):
    try:
        updated = service.mark_as_read(id, user_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificación no encontrada o no pertenece al usuario"
            )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error marking notification {id} as read for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al marcar la notificación como leída"
        )

@router.post("/read-all", response_model=List[Dict[str, Any]])
async def read_all_notifications(
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service)
):
    try:
        return service.mark_all_as_read(user_id)
    except Exception as e:
        log.error(f"Error marking all notifications as read for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al marcar todas las notificaciones como leídas"
        )

@router.post("/fcm-token", status_code=status.HTTP_201_CREATED)
async def register_token(
    payload: FCMTokenPayload,
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service)
):
    try:
        service.register_fcm_token(user_id, payload.token)
        return {"status": "registered"}
    except Exception as e:
        log.error(f"Error registering FCM token for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar token FCM"
        )

@router.delete("/fcm-token", status_code=status.HTTP_200_OK)
async def unregister_token(
    token: str = Query(..., description="FCM token to unregister"),
    user_id: str = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service)
):
    try:
        service.unregister_fcm_token(user_id, token)
        return {"status": "unregistered"}
    except Exception as e:
        log.error(f"Error unregistering FCM token for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar token FCM"
        )
