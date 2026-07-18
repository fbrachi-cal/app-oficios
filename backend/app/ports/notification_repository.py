from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class NotificationRepository(ABC):
    @abstractmethod
    def save_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """Persists a notification in the database."""
        pass

    @abstractmethod
    def get_notifications_by_recipient(self, recipient_uid: str) -> List[Dict[str, Any]]:
        """Retrieves all notifications for a given recipient, sorted by created_at desc."""
        pass

    @abstractmethod
    def mark_notification_as_read(self, notification_id: str, recipient_uid: str) -> Optional[Dict[str, Any]]:
        """Marks a specific notification as read."""
        pass

    @abstractmethod
    def mark_all_notifications_as_read(self, recipient_uid: str) -> List[Dict[str, Any]]:
        """Marks all notifications for a given recipient as read."""
        pass

    @abstractmethod
    def save_fcm_token(self, uid: str, token: str) -> None:
        """Stores a token associated with a user UID."""
        pass

    @abstractmethod
    def delete_fcm_token(self, uid: str, token: str) -> None:
        """Deletes a token associated with a user UID."""
        pass

    @abstractmethod
    def get_fcm_tokens_by_uid(self, uid: str) -> List[str]:
        """Retrieves all FCM tokens for a user UID."""
        pass

    @abstractmethod
    def save_device_token(
        self,
        uid: str,
        token: str,
        platform: str,
        app_version: Optional[str] = None,
        device_id: Optional[str] = None,
        permission_status: Optional[str] = None,
    ) -> None:
        """Stores or updates device details associated with a user UID."""
        pass

    @abstractmethod
    def delete_device_token(self, uid: str, token: str) -> None:
        """Deletes/deactivates a device token for a user UID."""
        pass

    @abstractmethod
    def get_device_tokens_by_uid(self, uid: str) -> List[str]:
        """Retrieves active device tokens for a user UID."""
        pass

