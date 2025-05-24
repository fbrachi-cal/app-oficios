# app/ports/chat_repository.py
from typing import List, Dict, Optional
from app.shared.logger import log

class ChatRepository:
    """Interfaz para persistir chats y mensajes."""
    def get_or_create_chat(self, participants: List[str]) -> Dict:
        """
        Busca un chat con exactamente esos participantes.
        Si no existe, lo crea. Devuelve un dict con al menos {'id', 'participants', 'createdAt'}.
        """
        raise NotImplementedError

    def add_message(self, chat_id: str, sender_id: str, body: str) -> str:
        """
        Inserta un mensaje en el sub-collection 'messages' del chat.
        Devuelve el ID del mensaje.
        """
        raise NotImplementedError

    def get_chat(self, chat_id: str) -> Optional[Dict]:
        """(Opcional) Recupera un chat por ID, con sus metadatos."""
        raise NotImplementedError
    
    def get_messages(self, chat_id: str) -> List[Dict]:
        log.info(f"Recuperando mensajes del chat {chat_id}")
        messages_ref = (
            self.chats
            .document(chat_id)
            .collection("messages")
            .order_by("sentAt")
            .limit_to_last(10)
        )
        messages = []
        docs= messages_ref.get()
        messages: List[Dict] = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            messages.append(data)
        log.info(f"Mensajes recuperados: {messages.count}")
        return messages

