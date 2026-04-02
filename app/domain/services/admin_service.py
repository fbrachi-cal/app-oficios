"""
Admin domain service.
Handles user management operations performed by administrators.
All mutations record audit metadata (updated_by, updated_at).
"""
from datetime import datetime
from typing import Optional, List, Dict
from app.ports.user_repository import UserRepository
from app.ports.chat_repository import ChatRepository
from app.ports.request_repository import RequestRepository
from app.shared.logger import log


class AdminService:
    def __init__(self, user_repository: UserRepository, chat_repository: ChatRepository, request_repository: RequestRepository = None):
        self.user_repository = user_repository
        self.chat_repository = chat_repository
        self.request_repository = request_repository

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def list_users(
        self,
        limit: int = 20,
        start_after_id: Optional[str] = None,
        search: Optional[str] = None,
        role_filter: Optional[str] = None,
    ) -> Dict:
        """
        Returns all users from Firestore with in-memory filtering and cursor pagination.
        Firestore doesn't support full-text search, so we fetch all and filter.
        For large datasets, consider a dedicated search index (Algolia, etc.).
        """
        all_users: List[Dict] = self.user_repository.get_all_users()

        # Apply search filter (case-insensitive on nombre and id/email)
        if search:
            q = search.lower()
            all_users = [
                u for u in all_users
                if q in (u.get("nombre") or "").lower()
                or q in (u.get("id") or "").lower()
                or q in (u.get("email") or "").lower()
            ]

        # Apply role filter
        if role_filter:
            all_users = [u for u in all_users if u.get("tipo") == role_filter]

        # Sort by created_at descending (users without the field go to the end)
        all_users.sort(
            key=lambda u: u.get("created_at") or datetime.min,
            reverse=True,
        )

        total = len(all_users)

        # Cursor-based pagination (find index of start_after_id)
        start_index = 0
        if start_after_id:
            for i, u in enumerate(all_users):
                if u.get("id") == start_after_id:
                    start_index = i + 1
                    break

        page = all_users[start_index: start_index + limit]
        next_cursor = page[-1]["id"] if len(page) == limit else None

        log.info(f"admin.list_users — total={total} start_after={start_after_id} returned={len(page)}")
        return {"items": page, "total": total, "limit": limit, "next_cursor": next_cursor}

    def get_user(self, uid: str) -> Optional[Dict]:
        return self.user_repository.get_user_by_id(uid)

    def patch_user(self, uid: str, datos: dict, admin_uid: str) -> Optional[Dict]:
        """
        Partially updates user fields.
        Automatically populates audit fields: updated_by, updated_at.
        Raises ValueError if user not found.
        """
        user = self.user_repository.get_user_by_id(uid)
        if not user:
            return None

        campos = {k: v for k, v in datos.items() if v is not None}
        campos["updated_by"] = admin_uid
        campos["updated_at"] = datetime.utcnow()

        log.info(f"admin.patch_user uid={uid} by={admin_uid} campos={campos}")
        self.user_repository.actualizar_campos_usuario(uid, campos)

        # Return the refreshed user
        updated = self.user_repository.get_user_by_id(uid)
        return updated

    # ------------------------------------------------------------------
    # Chats
    # ------------------------------------------------------------------

    def list_chats(
        self,
        limit: int = 20,
        start_after_id: Optional[str] = None,
        search_uid: Optional[str] = None,
    ) -> Dict:
        """
        Returns all chats.  Optionally filters by a participant UID.
        Implements simple cursor pagination on the in-memory sorted list.
        """
        if search_uid:
            all_chats = self.chat_repository.get_chats_for_user(search_uid)
        else:
            all_chats = self.chat_repository.get_all_chats()

        # Sort by lastMessageAt descending
        all_chats.sort(
            key=lambda c: c.get("lastMessageAt") or c.get("createdAt") or datetime.min,
            reverse=True,
        )

        total = len(all_chats)

        start_index = 0
        if start_after_id:
            for i, c in enumerate(all_chats):
                if c.get("id") == start_after_id:
                    start_index = i + 1
                    break

        page = all_chats[start_index: start_index + limit]
        next_cursor = page[-1]["id"] if len(page) == limit else None

        return {"items": page, "total": total, "limit": limit, "next_cursor": next_cursor}

    def get_chat_with_messages(self, chat_id: str) -> Optional[Dict]:
        chat = self.chat_repository.get_chat(chat_id)
        if not chat:
            return None
            
        # Safe handling for exceptionally large conversations
        messages = self.chat_repository.get_messages(chat_id, limit=500)
        chat["messages"] = messages
        
        # Enrich the response with participant metadata for the admin
        participant_details = []
        participants = chat.get("participants", [])
        for pid in participants:
            user = self.user_repository.get_user_by_id(pid)
            if user:
                participant_details.append({
                    "id": pid,
                    "nombre": user.get("nombre", "Desconocido"),
                    "tipo": user.get("tipo", "Desconocido"),
                    "email": user.get("email", "Sin email")
                })
            else:
                 participant_details.append({
                    "id": pid,
                    "nombre": "Usuario Eliminado",
                    "tipo": "Desconocido",
                    "email": "Desconocido"
                 })
        chat["participantDetails"] = participant_details

        return chat
        
    # ------------------------------------------------------------------
    # Solicitudes (Requests)
    # ------------------------------------------------------------------

    def list_requests_with_interactions(
        self,
        limit: int = 20,
        start_after_id: Optional[str] = None
    ) -> Dict:
        if not self.request_repository:
            return {"items": [], "total": 0, "limit": limit, "next_cursor": None}
            
        all_reqs = self.request_repository.get_all_requests()
        filtered = [r for r in all_reqs if len(r.get("historial_consultas", [])) > 0]
        
        filtered.sort(
            key=lambda r: r.get("fecha_creacion") or datetime.min,
            reverse=True,
        )

        total = len(filtered)
        start_index = 0
        if start_after_id:
            for i, r in enumerate(filtered):
                if r.get("id") == start_after_id:
                    start_index = i + 1
                    break
                    
        page = filtered[start_index: start_index + limit]
        next_cursor = page[-1]["id"] if len(page) == limit else None

        return {"items": page, "total": total, "limit": limit, "next_cursor": next_cursor}

    def get_request_with_messages(self, request_id: str) -> Optional[Dict]:
        if not self.request_repository:
            return None
            
        req = self.request_repository.get_by_id(request_id)
        if not req:
            return None
        
        participant_details = []
        participants = [req.get("solicitante_id"), req.get("profesional_id")]
        for pid in participants:
            if not pid:
                continue
            user = self.user_repository.get_user_by_id(pid)
            if user:
                participant_details.append({
                    "id": pid,
                    "nombre": user.get("nombre", "Desconocido"),
                    "tipo": user.get("tipo", "Desconocido"),
                    "email": user.get("email", "Sin email")
                })
        req["participantDetails"] = participant_details
        return req

    def add_admin_message_to_request(self, request_id: str, admin_uid: str, mensaje: str) -> dict:
        if not self.request_repository:
            raise ValueError("Repository no configurado")
            
        req = self.request_repository.get_by_id(request_id)
        if not req:
            raise ValueError("Solicitud no encontrada")
            
        consulta = {
            "mensaje": mensaje,
            "usuario_id": "admin",
            "rol": "admin",
            "autor_id": admin_uid,
            "fecha": datetime.utcnow()
        }
        
        return self.request_repository.agregar_a_array(request_id, "historial_consultas", consulta)
