import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.domain.services.user_service import UserService

@pytest.fixture
def user_service():
    repo = FirebaseUserRepository()
    return UserService(repo)

def test_registrar_y_obtener_usuario(user_service):
    user_data = {
        "id": "test_user_001",
        "nombre": "Test Profesional",
        "tipo": "profesional",
        "oficio": "gasista",
        "zona": "Palermo"
    }

    user_service.registrar_usuario(user_data)
    fetched_user = user_service.obtener_usuario("test_user_001")

    assert fetched_user is not None
    assert fetched_user["id"] == "test_user_001"
    assert fetched_user["nombre"] == "Test Profesional"
