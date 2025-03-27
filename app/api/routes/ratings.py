from fastapi import APIRouter, HTTPException, Depends
from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
from app.domain.services.rating_service import RatingService
from app.shared.firebase_auth import verify_token
from app.api.schemas.rating_schema import CalificacionRegistro
from app.shared.roles import require_role
from uuid import uuid4



router = APIRouter()
service = RatingService(FirebaseRatingRepository())

@router.post("/")
def agregar_calificacion(calificacion: CalificacionRegistro, user_data: dict = Depends(require_role("cliente"))):
    try:
        calificacion_data = calificacion.dict()
        calificacion_data["cliente_id"] = user_data["uid"]
        calificacion_data["id"] = str(uuid4())
        service.agregar_calificacion(calificacion.dict())
        return {"mensaje": "Calificación guardada con éxito"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/profesional/{profesional_id}")
def obtener_calificaciones(profesional_id: str, user_data: dict = Depends(require_role("profesional"))):
    return service.obtener_calificaciones_por_profesional(profesional_id)
