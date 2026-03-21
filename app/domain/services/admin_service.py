"""
Admin domain service.
Handles user management operations performed by administrators.
All mutations record audit metadata (updated_by, updated_at).
"""
from datetime import datetime
from typing import Optional, List, Dict
from app.ports.user_repository import UserRepository
from app.ports.chat_repository import ChatRepository
from app.shared.logger import log


class AdminService:
    def __init__(self, user_repository: UserRepository, chat_repository: ChatRepository):
        self.user_repository = user_repository
        self.chat_repository = chat_repository

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
        messages = self.chat_repository.get_messages(chat_id)
        chat["messages"] = messages
        return chat
