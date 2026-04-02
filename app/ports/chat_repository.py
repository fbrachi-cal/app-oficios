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
    
    def get_messages(self, chat_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Recupera los mensajes del chat, opcionalmente limitando a los últimos `limit` mensajes."""
        raise NotImplementedError
    def get_all_chats(self) -> List[Dict]:
        """Recupera todos los chats del sistema (uso exclusivo de admin)."""
        raise NotImplementedError

    def get_chats_for_user(self, uid: str) -> List[Dict]:
        """Recupera los chats donde participa un usuario específico."""
        raise NotImplementedError

