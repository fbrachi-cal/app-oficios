import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.api.dependencies import get_notification_service, get_current_user_id
from app.domain.services.notification_service import NotificationService

# Mock user id dependency for test client
async def mock_get_current_user_id():
    return "test-user-123"

@pytest.fixture
def mock_repo():
    repo = MagicMock()
    # Mock defaults
    repo.get_notifications_by_recipient.return_value = [
        {
            "id": "notif-1",
            "recipient_uid": "test-user-123",
            "actor_uid": "actor-456",
            "type": "professional_contacted",
            "title": "Te han contactado",
            "body": "Un cliente ha iniciado un contacto.",
            "read": False,
            "created_at": "2026-05-28T12:00:00Z"
        }
    ]
    repo.mark_notification_as_read.return_value = {
        "id": "notif-1",
        "recipient_uid": "test-user-123",
        "actor_uid": "actor-456",
        "type": "professional_contacted",
        "title": "Te han contactado",
        "body": "Un cliente ha iniciado un contacto.",
        "read": True,
        "created_at": "2026-05-28T12:00:00Z"
    }
    repo.mark_all_notifications_as_read.return_value = [
        {
            "id": "notif-1",
            "read": True
        }
    ]
    repo.get_fcm_tokens_by_uid.return_value = ["token-1", "token-2"]
    return repo

@pytest.fixture
def client(mock_repo):
    service = NotificationService(repo=mock_repo)
    
    # Override FastAPI app dependencies
    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id
    app.dependency_overrides[get_notification_service] = lambda: service
    
    with TestClient(app) as test_client:
        yield test_client
        
    app.dependency_overrides.clear()

def test_get_my_notifications(client, mock_repo):
    response = client.get("/notifications/me")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "notif-1"
    assert data[0]["recipient_uid"] == "test-user-123"
    mock_repo.get_notifications_by_recipient.assert_called_once_with("test-user-123")

def test_read_notification(client, mock_repo):
    response = client.post("/notifications/notif-1/read")
    assert response.status_code == 200
    data = response.json()
    assert data["read"] is True
    mock_repo.mark_notification_as_read.assert_called_once_with("notif-1", "test-user-123")

def test_read_all_notifications(client, mock_repo):
    response = client.post("/notifications/read-all")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["read"] is True
    mock_repo.mark_all_notifications_as_read.assert_called_once_with("test-user-123")

def test_register_fcm_token(client, mock_repo):
    response = client.post("/notifications/fcm-token", json={"token": "test-fcm-token"})
    assert response.status_code == 201
    assert response.json() == {"status": "registered"}
    mock_repo.save_fcm_token.assert_called_once_with("test-user-123", "test-fcm-token")

def test_unregister_fcm_token(client, mock_repo):
    response = client.delete("/notifications/fcm-token?token=test-fcm-token")
    assert response.status_code == 200
    assert response.json() == {"status": "unregistered"}
    mock_repo.delete_fcm_token.assert_called_once_with("test-user-123", "test-fcm-token")

@patch('firebase_admin.messaging.send_each_for_multicast')
def test_create_and_send_notification_success(mock_send_each, mock_repo):
    # Setup mock send response
    mock_send_response = MagicMock()
    mock_send_response.success_count = 2
    mock_send_response.failure_count = 0
    mock_send_each.return_value = mock_send_response

    # Setup repo mock save return
    mock_repo.save_notification.return_value = {
        "id": "notif-new",
        "recipient_uid": "user-abc",
        "actor_uid": "user-xyz",
        "type": "professional_contacted",
        "title": "Te han contactado",
        "body": "Hola!",
        "read": False
    }

    service = NotificationService(repo=mock_repo)
    
    # Run async function under event loop
    import asyncio
    saved = asyncio.run(service.create_and_send_notification(
        recipient_uid="user-abc",
        actor_uid="user-xyz",
        type="professional_contacted",
        title="Te han contactado",
        body="Hola!",
        related_entity_type="chat",
        related_entity_id="chat-123"
    ))

    assert saved["id"] == "notif-new"
    mock_repo.save_notification.assert_called_once()
    mock_repo.get_fcm_tokens_by_uid.assert_called_once_with("user-abc")
    mock_send_each.assert_called_once()

@patch('firebase_admin.messaging.send_each_for_multicast')
def test_create_and_send_notification_logs_failures_defensively(mock_send_each, mock_repo):
    # Simulate FCM exception
    mock_send_each.side_effect = Exception("FCM Network Timeout")

    mock_repo.save_notification.return_value = {
        "id": "notif-new",
        "recipient_uid": "user-abc",
        "actor_uid": "user-xyz",
        "type": "professional_contacted",
        "title": "Te han contactado",
        "body": "Hola!"
    }

    service = NotificationService(repo=mock_repo)
    
    import asyncio
    # FCM error must not raise an exception, the function should complete successfully
    saved = asyncio.run(service.create_and_send_notification(
        recipient_uid="user-abc",
        actor_uid="user-xyz",
        type="professional_contacted",
        title="Te han contactado",
        body="Hola!"
    ))

    assert saved["id"] == "notif-new"
    mock_send_each.assert_called_once()
