print("✅ Router de /contactos cargado")
from fastapi import APIRouter, Depends, HTTPException, status, Depends
from pydantic import BaseModel
from app.ports.chat_repository import ChatRepository
from app.ports.user_repository import UserRepository
from app.domain.services.contact_service import ContactService
from app.api.dependencies import get_current_user_id, get_chat_repo, get_user_repo

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
):
    service = ContactService(chat_repo=chat_repo, user_repo=user_repo)
    chat_id = await service.contact_professional(client_id, payload.professional_id, payload.message)
    return {"chatId": chat_id}
