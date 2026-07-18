print("✅ Router de /contactos cargado")
from fastapi import APIRouter, Depends, HTTPException, status, Depends
from pydantic import BaseModel
from app.ports.chat_repository import ChatRepository
from app.ports.user_repository import UserRepository
from app.domain.services.contact_service import ContactService
from app.api.dependencies import get_current_user_id, get_chat_repo, get_user_repo, get_notification_service
from app.domain.services.notification_service import NotificationService
from app.shared.logger import log

router = APIRouter(tags=["contactos"])

class ContactRequest(BaseModel):
    professional_id: str
    message: str


@router.post("/")
async def create_contact(
    payload: ContactRequest,
    client_id: str = Depends(get_current_user_id),
    chat_repo: ChatRepository = Depends(get_chat_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
):
    service = ContactService(chat_repo=chat_repo, user_repo=user_repo)
    chat_id = await service.contact_professional(client_id, payload.professional_id, payload.message)
    
    # Trigger professional contacted notification
    try:
        client = user_repo.get_user_by_id(client_id)
        client_name = client.get("nombre", "Un cliente") if client else "Un cliente"
        await notification_service.create_and_send_notification(
            recipient_uid=payload.professional_id,
            actor_uid=client_id,
            type="contact_requested",
            title="Te han contactado",
            body=f"{client_name} ha iniciado un contacto contigo.",
            related_entity_type="chat",
            related_entity_id=chat_id
        )
    except Exception as e:
        log.error(f"Error sending professional contacted notification: {e}")

    return {"chatId": chat_id}

