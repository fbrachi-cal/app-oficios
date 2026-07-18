from http.client import HTTPException
from fastapi import Body, APIRouter, Depends
from app.api.dependencies import get_current_user_id, get_chat_repo, get_user_repo, get_notification_service
from app.domain.services.notification_service import NotificationService
from app.ports.chat_repository import ChatRepository
from app.ports.user_repository import UserRepository
from app.domain.services.chat_service import ChatService
from app.shared.logger import log


router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("/")
async def list_user_chats(
    user_id: str = Depends(get_current_user_id),
    chat_repo: ChatRepository = Depends(get_chat_repo),
    user_repo: UserRepository = Depends(get_user_repo),
):
    log.info("BUSCO CHATS>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    if not user_id:
        raise HTTPException(status_code=401, detail="No autorizado")
    log.info(f"Listando chats para el usuario {user_id}")
    service = ChatService(chat_repo=chat_repo, user_repo=user_repo)
    return await service.list_chats_for_user(user_id)


@router.get("/{chat_id}/mensajes")
async def get_chat_messages(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    chat_repo: ChatRepository = Depends(get_chat_repo),
):
    # Opcional: verificar que el usuario sea parte del chat
    chat = chat_repo.get_chat(chat_id)
    if not chat or user_id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    
    return chat_repo.get_messages(chat_id)

@router.post("/{chat_id}/mensajes", status_code=201)
async def post_chat_message(
    chat_id: str,
    body: str = Body(..., embed=True),
    user_id: str = Depends(get_current_user_id),
    chat_repo: ChatRepository = Depends(get_chat_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
):
    log.info(f"Enviando mensaje al chat {chat_id} por el usuario {user_id}, payload: {body}")
    # verificamos que el usuario participe del chat
    chat = chat_repo.get_chat(chat_id)
    if not chat or user_id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")

    # creamos el mensaje en tu repositorio
    new_msg = chat_repo.add_message(chat_id, user_id, body)
    
    # Trigger message received notification
    try:
        participants = chat.get("participants", [])
        recipients = [p for p in participants if p != user_id]
        if recipients:
            recipient_uid = recipients[0]
            sender = user_repo.get_user_by_id(user_id)
            sender_name = sender.get("nombre", "Usuario") if sender else "Usuario"
            await notification_service.create_and_send_notification(
                recipient_uid=recipient_uid,
                actor_uid=user_id,
                type="chat_message",
                title=f"Mensaje de {sender_name}",
                body=body,
                related_entity_type="chat",
                related_entity_id=chat_id
            )
    except Exception as e:
        log.error(f"Error sending message received notification: {e}")
        
    return new_msg

