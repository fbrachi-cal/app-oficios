import pytest
from unittest.mock import MagicMock
from app.domain.services.request_service import RequestService

def test_agregar_consulta_validation_active_states():
    mock_repo = MagicMock()
    service = RequestService(mock_repo)
    
    # Active states should allow comments/messages
    for estado in ["creada", "consulta", "aceptada"]:
        mock_repo.get_by_id.return_value = {
            "id": "req_123",
            "solicitante_id": "client_1",
            "profesional_id": "pro_1",
            "estado": estado
        }
        
        # Should NOT raise any exception
        service.agregar_consulta("req_123", "client_1", "Hola", None)

def test_agregar_consulta_validation_inactive_states():
    mock_repo = MagicMock()
    service = RequestService(mock_repo)
    
    # Inactive states should block messages
    for estado in ["confirmada", "cancelada", "rechazada"]:
        mock_repo.get_by_id.return_value = {
            "id": "req_123",
            "solicitante_id": "client_1",
            "profesional_id": "pro_1",
            "estado": estado
        }
        
        with pytest.raises(Exception) as exc:
            service.agregar_consulta("req_123", "client_1", "Hola", None)
            
        assert "No se pueden enviar mensajes" in str(exc.value)
