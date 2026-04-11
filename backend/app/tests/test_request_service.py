import pytest
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.domain.services.request_service import RequestService

@pytest.fixture
def request_service():
    repo = FirebaseRequestRepository()
    return RequestService(repo)

def test_crear_y_listar_solicitudes(request_service):
    solicitud = {
        "id": "req_001",
        "cliente_id": "user_001",
        "profesional_id": "user_002",
        "descripcion": "Necesito arreglar un enchufe",
        "estado": "pendiente"
    }

    request_service.crear_solicitud(solicitud)
    solicitudes = request_service.obtener_solicitudes_por_usuario("user_001")

    assert any(s["id"] == "req_001" for s in solicitudes)
