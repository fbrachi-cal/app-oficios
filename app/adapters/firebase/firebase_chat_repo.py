# app/adapters/firebase/firebase_chat_repo.py
from typing import List, Dict, Optional
from google.cloud.firestore_v1 import Client, DocumentSnapshot
from app.ports.chat_repository import ChatRepository
from app.adapters.firebase.firebase_config import get_firestore
from datetime import datetime

class FirebaseChatRepository(ChatRepository):
    def __init__(self):
        self.db: Client = get_firestore()
        self.chats = self.db.collection("chats")
        
    def get_chat(self, chat_id: str) -> Optional[Dict]:
        doc: DocumentSnapshot = self.chats.document(chat_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def get_or_create_chat(self, participants: List[str]) -> Dict:
        # Intentamos encontrar un chat con exactamente esos participantes
        # (debes ordenar o normalizar la lista para coincidir siempre)
        participants = sorted(participants)
        query = (
            self.chats
            .where("participants", "==", participants)
            .limit(1)
        )
        docs = list(query.stream())
        if docs:
            doc = docs[0]
            data = doc.to_dict()
            data["id"] = doc.id
            return data

        # Si no existe, lo creamos
        new_ref = self.chats.document()
        payload = {
            "participants": participants,
            "createdAt": datetime.utcnow(),
        }
        new_ref.set(payload)
        return {"id": new_ref.id, **payload}

    def add_message(self, chat_id: str, sender_id: str, body: str) -> str:
        # Guardamos el mensaje en la subcolección "messages"
        msg_ref = (
            self.chats
            .document(chat_id)
            .collection("messages")
            .document()
        )
        payload = {
            "senderId": sender_id,
            "body": body,
            "sentAt": datetime.utcnow(),
        }
        msg_ref.set(payload)
        self.chats.document(chat_id).update({
            "lastMessage": body,
            "lastMessageAt": datetime.utcnow()
        })

        return msg_ref.id

   
    def get_chats_for_user(self, uid: str) -> List[Dict]:
        query = self.chats.where("participants", "array_contains", uid)
        chat_docs = list(query.stream())

        chats = []
        for doc in chat_docs:
            chat = doc.to_dict()
            chat["id"] = doc.id

            # Obtener último mensaje
            messages_ref = (
                self.chats.document(doc.id)
                .collection("messages")
                .order_by("sentAt", direction="DESCENDING")
                .limit(1)
                .stream()
            )

            for msg_doc in messages_ref:
                msg = msg_doc.to_dict()
                chat["lastMessage"] = msg.get("body")
                chat["lastMessageSenderId"] = msg.get("senderId")
                chat["lastMessageAt"] = msg.get("sentAt")

            chats.append(chat)

        return chats

    def get_all_chats(self) -> list:
        """Returns all chats in the system, for admin use only."""
        docs = list(self.chats.stream())
        result = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            result.append(data)
        return result
