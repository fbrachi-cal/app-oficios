from datetime import datetime
from typing import List, Dict, Any, Optional
from firebase_admin import firestore
from app.ports.notification_repository import NotificationRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log

class FirebaseNotificationRepository(NotificationRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("notificaciones")

    def save_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        doc_ref = self.collection.document()
        notification_data["created_at"] = datetime.utcnow().isoformat()
        notification_data["read"] = False
        doc_ref.set(notification_data)
        return {"id": doc_ref.id, **notification_data}

    def get_notifications_by_recipient(self, recipient_uid: str) -> List[Dict[str, Any]]:
        docs = self.collection.where("recipient_uid", "==", recipient_uid).stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        
        # Sort in-memory by created_at descending to avoid Firestore index requirements
        results.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return results

    def mark_notification_as_read(self, notification_id: str, recipient_uid: str) -> Optional[Dict[str, Any]]:
        doc_ref = self.collection.document(notification_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            if data.get("recipient_uid") == recipient_uid:
                doc_ref.update({"read": True})
                data["read"] = True
                data["id"] = doc.id
                return data
        return None

    def mark_all_notifications_as_read(self, recipient_uid: str) -> List[Dict[str, Any]]:
        docs = self.collection.where("recipient_uid", "==", recipient_uid).where("read", "==", False).stream()
        updated_notifications = []
        
        # Batch write for atomicity and speed
        batch = self.db.batch()
        for doc in docs:
            batch.update(doc.reference, {"read": True})
            data = doc.to_dict()
            data["read"] = True
            data["id"] = doc.id
            updated_notifications.append(data)
            
        if updated_notifications:
            batch.commit()
            
        return updated_notifications

    def save_fcm_token(self, uid: str, token: str) -> None:
        doc_ref = self.db.collection("fcm_tokens").document(token)
        doc_ref.set({
            "uid": uid,
            "updated_at": datetime.utcnow()
        })
        log.info(f"Registered FCM token for user {uid}")

    def delete_fcm_token(self, uid: str, token: str) -> None:
        doc_ref = self.db.collection("fcm_tokens").document(token)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            if data.get("uid") == uid:
                doc_ref.delete()
                log.info(f"Deleted FCM token for user {uid}")

    def get_fcm_tokens_by_uid(self, uid: str) -> List[str]:
        docs = self.db.collection("fcm_tokens").where("uid", "==", uid).stream()
        return [doc.id for doc in docs]

    def save_device_token(
        self,
        uid: str,
        token: str,
        platform: str,
        app_version: Optional[str] = None,
        device_id: Optional[str] = None,
        permission_status: Optional[str] = None,
    ) -> None:
        import hashlib
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        doc_ref = self.db.collection("push_tokens").document(token_hash)
        doc = doc_ref.get()
        now = datetime.utcnow()
        
        data = {
            "uid": uid,
            "token": token,
            "platform": platform,
            "active": True,
            "updated_at": now,
            "last_seen_at": now,
        }
        if app_version is not None:
            data["app_version"] = app_version
        if device_id is not None:
            data["device_id"] = device_id
        if permission_status is not None:
            data["permission_status"] = permission_status
            
        if not doc.exists:
            data["created_at"] = now
            doc_ref.set(data)
        else:
            doc_ref.update(data)
        log.info(f"Registered device push token for user {uid}")

    def delete_device_token(self, uid: str, token: str) -> None:
        import hashlib
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        doc_ref = self.db.collection("push_tokens").document(token_hash)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            if data.get("uid") == uid:
                doc_ref.update({"active": False, "updated_at": datetime.utcnow()})
                log.info(f"Deactivated device push token for user {uid}")

    def get_device_tokens_by_uid(self, uid: str) -> List[str]:
        docs = self.db.collection("push_tokens").where("uid", "==", uid).where("active", "==", True).stream()
        return [doc.to_dict().get("token") for doc in docs if doc.to_dict().get("token")]

