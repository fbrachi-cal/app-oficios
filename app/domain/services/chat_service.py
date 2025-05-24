from typing import List
from app.ports.chat_repository import ChatRepository
from app.ports.user_repository import UserRepository

class ChatService:
    def __init__(self, chat_repo: ChatRepository, user_repo: UserRepository):
        self.chat_repo = chat_repo
        self.user_repo = user_repo

    async def list_chats_for_user(self, uid: str) -> List[dict]:
        chats = self.chat_repo.get_chats_for_user(uid)

        for chat in chats:
            participant_uids = chat.get("participants", [])
            # Obtener detalles de los participantes
            users = self.user_repo.get_users_by_ids(participant_uids)
            chat["participants_details"] = users

        return chats
