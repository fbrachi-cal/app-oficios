from datetime import datetime
from typing import List, Dict, Any, Optional
from firebase_admin import firestore
from app.ports.notification_repository import NotificationRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log

class FirebaseNotificationRepository(NotificationRepository):
    def __init__(self, db=None):
        self.db = db if db is not None else get_firestore()
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
        auth_time: Optional[int] = None,
        client_sequence: Optional[int] = None,
        installation_id: Optional[str] = None,
    ) -> None:
        import hashlib
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        doc_ref = self.db.collection("push_tokens").document(token_hash)
        
        transaction = self.db.transaction()
        now = datetime.utcnow()
        
        @firestore.transactional
        def _run(txn, doc_ref):
            doc = doc_ref.get(transaction=txn)
            should_write = True
            
            if doc.exists:
                existing = doc.to_dict()
                existing_uid = existing.get("uid")
                existing_auth_time = existing.get("auth_time")
                existing_client_sequence = existing.get("client_sequence")
                existing_installation_id = existing.get("installation_id")
                
                # 1. Missing auth_time guard
                if auth_time is None:
                    if existing_uid != uid:
                        log.warning(
                            f"Missing auth_time claim in registration request for user {uid} (token owned by {existing_uid}). Ignoring request."
                        )
                        should_write = False
                else:
                    # 2. Compare auth_time
                    if existing_auth_time is not None:
                        if auth_time < existing_auth_time:
                            log.info(
                                f"Ignoring stale token registration request for user {uid}. Incoming auth_time {auth_time} is older than stored auth_time {existing_auth_time}"
                            )
                            should_write = False
                        elif auth_time == existing_auth_time and existing_uid != uid:
                            # 3. Equal auth_time tie-breaker: check installation_id and client_sequence
                            if (
                                installation_id is not None 
                                and existing_installation_id is not None 
                                and installation_id == existing_installation_id
                            ):
                                if client_sequence is not None and existing_client_sequence is not None:
                                    if client_sequence <= existing_client_sequence:
                                        log.info(
                                            f"Ignoring duplicate/equal auth_time token registration request for user {uid}. Same installation, sequence {client_sequence} is <= stored sequence {existing_client_sequence}."
                                        )
                                        should_write = False
                                else:
                                    should_write = False
                            else:
                                # Different or missing installation_id: reject cross-UID reassignment if auth_time is equal
                                log.info(
                                    f"Ignoring duplicate/equal auth_time token registration request for user {uid}. Different or missing installation_id (incoming: {installation_id}, stored: {existing_installation_id})."
                                )
                                should_write = False

            if should_write:
                data = {
                    "uid": uid,
                    "token": token,
                    "platform": platform,
                    "active": True,
                    "updated_at": now,
                    "last_seen_at": now,
                    "auth_time": auth_time,
                    "client_sequence": client_sequence,
                    "installation_id": installation_id,
                }
                if app_version is not None:
                    data["app_version"] = app_version
                if device_id is not None:
                    data["device_id"] = device_id
                if permission_status is not None:
                    data["permission_status"] = permission_status
                
                if not doc.exists:
                    data["created_at"] = now
                    txn.set(doc_ref, data)
                else:
                    txn.update(doc_ref, data)
                return True
            return False

        success = _run(transaction, doc_ref)
        if success:
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

