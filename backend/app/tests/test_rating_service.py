import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
from app.domain.services.rating_service import RatingService

@pytest.fixture
def rating_service():
    repo = FirebaseRatingRepository()
    return RatingService(repo)

def test_agregar_y_obtener_calificaciones(rating_service):
    calificacion = {
        "id": "rating_001",
        "profesional_id": "user_002",
        "cliente_id": "user_001",
        "puntuacion": 5,
        "comentario": "Excelente atención"
    }

    # Guardar la calificación
    rating_service.agregar_calificacion(calificacion)

    # Recuperar las calificaciones del profesional
    calificaciones = rating_service.obtener_calificaciones_por_profesional("user_002")

    # Verificar que la calificación esté presente
    assert any(c["id"] == "rating_001" for c in calificaciones)
    assert any(c["puntuacion"] == 5 for c in calificaciones)
