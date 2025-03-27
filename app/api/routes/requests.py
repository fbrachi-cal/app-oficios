from fastapi import APIRouter, HTTPException, Depends

from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.domain.services.request_service import RequestService
from app.shared.firebase_auth import verify_token
from app.api.schemas.request_schema import SolicitudRegistro
from app.shared.roles import require_role
from uuid import uuid4



router = APIRouter()
service = RequestService(FirebaseRequestRepository())

@router.post("/")
def crear_solicitud(solicitud: SolicitudRegistro, user_data: dict =  Depends(require_role("cliente"))):
    try:
        solicitud_data = solicitud.dict()
        solicitud_data["cliente_id"] = user_data["uid"]
        solicitud_data["id"] = str(uuid4())
        service.crear_solicitud(solicitud.dict())
        return {"mensaje": "Solicitud creada con éxito"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/cliente/{cliente_id}")
def obtener_solicitudes(cliente_id: str, user_data: dict = Depends(require_role("cliente"))):
    return service.obtener_solicitudes_por_usuario(cliente_id)
