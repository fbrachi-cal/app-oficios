import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
import sys
import os

# Add backend directory to sys path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.shared.firebase_auth import verify_token, parse_status_expires_at
from firebase_admin import auth

def test_parse_status_expires_at():
    # Valid ISO string
    dt = parse_status_expires_at("2026-04-18T10:00:00Z")
    assert dt is not None
    assert getattr(dt, 'tzinfo', None) is None

    # Invalid string
    dt2 = parse_status_expires_at("invalid_date")
    assert dt2 is None

    # None
    assert parse_status_expires_at(None) is None

@patch('app.shared.firebase_auth.FirebaseUserRepository')
@patch('app.shared.firebase_auth.auth.verify_id_token')
def test_verify_token_valid_legacy_user(mock_verify_id_token, MockRepo):
    # This verifies that a normal legacy user doesn't crash on expires_at and returns successfully
    mock_verify_id_token.return_value = {'uid': '123'}
    repo_instance = MockRepo.return_value
    repo_instance.get_user_by_id.return_value = {"id": "123"}  # No status Field

    class MockCredentials:
        credentials = "fake_token"
    
    # Should not raise any exceptions
    token = verify_token(MockCredentials())
    assert token == {'uid': '123'}

@patch('app.shared.firebase_auth.FirebaseUserRepository')
@patch('app.shared.firebase_auth.auth.verify_id_token')
def test_verify_token_expired_firebase_token(mock_verify_id_token, MockRepo):
    # An expired token should raise 401 specifically, not 500
    mock_verify_id_token.side_effect = auth.ExpiredIdTokenError("Token expired", "")

    class MockCredentials:
        credentials = "fake_token"
    
    with pytest.raises(HTTPException) as exc:
        verify_token(MockCredentials())
    assert exc.value.status_code == 401
    assert "expirado" in exc.value.detail.lower()

@patch('app.shared.firebase_auth.FirebaseUserRepository')
@patch('app.shared.firebase_auth.auth.verify_id_token')
def test_verify_token_blocked_user(mock_verify_id_token, MockRepo):
    # A user designated as SUSPENDED or EXPELLED gets a 403
    mock_verify_id_token.return_value = {'uid': '456'}
    repo_instance = MockRepo.return_value
    repo_instance.get_user_by_id.return_value = {"id": "456", "status": "EXPELLED", "status_reason": "Policy violation"}

    class MockCredentials:
        credentials = "fake_token"
    
    with pytest.raises(HTTPException) as exc:
        verify_token(MockCredentials())
    assert exc.value.status_code == 403
    assert exc.value.detail["status"] == "EXPELLED"

@patch('app.shared.firebase_auth.FirebaseUserRepository')
@patch('app.shared.firebase_auth.auth.verify_id_token')
def test_verify_token_internal_server_error(mock_verify_id_token, MockRepo):
    # Any unexpected python error (like a DB crash) should raise 500
    mock_verify_id_token.return_value = {'uid': '789'}
    repo_instance = MockRepo.return_value
    repo_instance.get_user_by_id.side_effect = Exception("DB Connection Lost")

    class MockCredentials:
        credentials = "fake_token"
    
    with pytest.raises(HTTPException) as exc:
        verify_token(MockCredentials())
    assert exc.value.status_code == 500

def test_registrar_usuario_prevents_overwrite():
    from app.domain.services.user_service import UserService
    from app.api.schemas.user_schema import UsuarioRegistro
    
    mock_repo = MagicMock()
    # Simulate an existing user
    mock_repo.get_user_by_id.return_value = {"id": "existing123", "nombre": "Federico"}
    
    service = UserService(mock_repo)
    
    # Registration payload with same ID
    datos = UsuarioRegistro(id="existing123", nombre="Hacker", tipo="cliente")
    
    with pytest.raises(ValueError) as exc:
        service.registrar_usuario(datos)
    
    assert "ya se encuentra registrado. No se puede sobrescribir" in str(exc.value)
    
    # Assert save_user was NEVER called
    mock_repo.save_user.assert_not_called()

