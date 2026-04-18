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

        if "status" in campos and campos["status"] != user.get("status"):
            campos["status_changed_at"] = datetime.utcnow()
            campos["status_changed_by"] = admin_uid
            
            previous_status = user.get("status", "ACTIVE")
            new_status = campos["status"]
            
            # Auto-clear expiration for non-SUSPENDED statuses
            if new_status != "SUSPENDED":
                campos["status_expires_at"] = None
                
            # History tracking
            history_entry = {
                "previous_status": previous_status,
                "new_status": new_status,
                "reason": campos.get("status_reason", user.get("status_reason")),
                "admin_notes": campos.get("admin_notes", user.get("admin_notes")),
                "changed_at": datetime.utcnow(),
                "changed_by": admin_uid
            }
            # Add expires_at to history if it's a suspended state
            if new_status == "SUSPENDED" and campos.get("status_expires_at"):
                history_entry["expires_at"] = campos.get("status_expires_at")
                
            status_history = user.get("status_history", [])
            status_history.append(history_entry)
            campos["status_history"] = status_history
            
            # Sync with Firebase Authentication to harden security
            try:
                from firebase_admin import auth
                if new_status in ["SUSPENDED", "EXPELLED", "DEACTIVATED"]:
                    auth.update_user(uid, disabled=True)
                    auth.revoke_refresh_tokens(uid)
                    log.info(f"Firebase auth disabled and tokens revoked for uid={uid}")
                elif new_status == "ACTIVE":
                    auth.update_user(uid, disabled=False)
                    log.info(f"Firebase auth enabled for uid={uid}")
            except Exception as e:
                log.error(f"Failed to sync status={new_status} with Firebase Auth for uid={uid}: {e}")
                # We continue the patch so Firestore is still technically accurate

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
        filtered = [r for r in all_reqs if len(r.get("historial_consultas", [])) > 0 or r.get("descripcion")]
        
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
