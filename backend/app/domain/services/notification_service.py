from typing import List, Dict, Any, Optional
from firebase_admin import messaging
from app.ports.notification_repository import NotificationRepository
from app.shared.logger import log

class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self.repo = repo

    async def create_and_send_notification(
        self,
        recipient_uid: str,
        actor_uid: str,
        type: str,
        title: str,
        body: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1) Save notification in database (Firestore)
        notification_data = {
            "recipient_uid": recipient_uid,
            "actor_uid": actor_uid,
            "type": type,
            "title": title,
            "body": body,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id
        }
        saved_notif = self.repo.save_notification(notification_data)
        log.info(f"Notification persisted in DB: {saved_notif.get('id')}")

        # 2) Fetch recipient's FCM tokens
        tokens = self.repo.get_fcm_tokens_by_uid(recipient_uid)
        if not tokens:
            log.info(f"No FCM tokens found for user {recipient_uid}. Skipping push.")
            return saved_notif

        # 3) Build and send multicast notification
        try:
            # Prepare push payload
            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data={
                    "type": str(type),
                    "related_entity_type": str(related_entity_type or ""),
                    "related_entity_id": str(related_entity_id or ""),
                    "notification_id": str(saved_notif.get("id"))
                }
            )
            # Send via Admin SDK
            response = messaging.send_each_for_multicast(message)
            log.info(
                f"FCM Multicast complete. Success: {response.success_count}, "
                f"Failure: {response.failure_count}"
            )
        except Exception as e:
            # Defensively contain push failures, log only
            log.error(f"FCM push notification failed for recipient {recipient_uid}: {e}")

        return saved_notif

    def register_fcm_token(self, uid: str, token: str) -> None:
        self.repo.save_fcm_token(uid, token)

    def unregister_fcm_token(self, uid: str, token: str) -> None:
        self.repo.delete_fcm_token(uid, token)

    def get_user_notifications(self, uid: str) -> List[Dict[str, Any]]:
        return self.repo.get_notifications_by_recipient(uid)

    def mark_as_read(self, notification_id: str, uid: str) -> Optional[Dict[str, Any]]:
        return self.repo.mark_notification_as_read(notification_id, uid)

    def mark_all_as_read(self, uid: str) -> List[Dict[str, Any]]:
        return self.repo.mark_all_notifications_as_read(uid)
