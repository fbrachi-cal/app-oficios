from app.api.schemas.request_schema import RespuestaProfesionalRequest, ConsultaRequest, EstadoRequest
from app.domain.services.request_service import RequestService
from app.ports.request_repository import RequestRepository
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Body
from typing import List
from app.api.dependencies import get_current_user_id, get_request_repo, get_user_repo, get_file_uploader
from app.shared.logger import log
from app.ports.user_repository import UserRepository
from app.ports.file_uploader import FileUploader

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])

@router.patch("/{id}/estado")
async def actualizar_estado_solicitud(
    id: str,
    estado_request: EstadoRequest,
    user_id: str = Depends(get_current_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
):
    try:
        service = RequestService(request_repo)
        return service.cambiar_estado(id, user_id, estado_request.nuevo_estado,motivo=estado_request.motivo,
            observacion=estado_request.observacion)
    except Exception as e:
        log.error(f"Error al cambiar estado de solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}/consultar")
async def agregar_consulta_a_solicitud(
    id: str,
    consulta: ConsultaRequest,
    user_id: str = Depends(get_current_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
):
    try:
        service = RequestService(request_repo)
        return service.agregar_consulta(id, user_id, consulta.mensaje, consulta.fotos)
    except Exception as e:
        log.error(f"Error al agregar consulta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}/responder")
async def responder_solicitud(
    id: str,
    datos: RespuestaProfesionalRequest,
    user_id: str = Depends(get_current_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
):
    try:
        service = RequestService(request_repo)
        return service.actualizar_estado_y_respuesta_profesional(
            solicitud_id=id,
            nuevo_estado=datos.nuevo_estado,
            fechas_propuestas=datos.fechas_propuestas,
            observacion=datos.observacion_profesional,
            user_id=user_id,
        )
    except Exception as e:
        log.info(f"Error al responder solicitud: {e}")	
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mis")
async def listar_mis_solicitudes(
    user_id: str = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repo),
    request_repo: RequestRepository = Depends(get_request_repo),
):
    try:
        user = user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        log.info(f"🔍 Obteniendo solicitudes para usuario {user_id} ({user['tipo']})")

        service = RequestService(request_repo)

        if user["tipo"] == "cliente":
            return await service.listar_solicitudes_por_solicitante(user_id)
        elif user["tipo"] == "profesional":
            return await service.listar_solicitudes_por_profesional(user_id)
        else:
            raise HTTPException(status_code=400, detail="Tipo de usuario no válido")
    except Exception as e:
        log.error(f"Error al obtener solicitudes: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener solicitudes")



@router.post("/{profesional_id}")
async def crear_solicitud(
    profesional_id: str,
    zona: str = Form(...),
    subcategoria: str = Form(...),
    descripcion: str = Form(...),
    fotos: List[UploadFile] = File([]),
    user_id: str = Depends(get_current_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    uploader: FileUploader = Depends(get_file_uploader), 
):
    urls = []
    for foto in fotos:
        try:
            url = uploader.subir_imagen_con_thumbnail(foto)
            urls.append(url)
        except Exception as e:
            log.error(f"Error subiendo imagen: {foto.filename} - {e}")

    service = RequestService(request_repo)
    solicitud = await service.crear_solicitud(
        solicitante_id=user_id,
        profesional_id=profesional_id,
        zona=zona,
        subcategoria=subcategoria,
        descripcion=descripcion,
        fotos_urls=urls
    )
    return {"message": "Solicitud guardada", "data": solicitud}

@router.get("/{id}")
async def obtener_solicitud_por_id(
    id: str,
    user_id: str = Depends(get_current_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
):
    try:
        solicitud = request_repo.get_by_id(id)

        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        # Asegurar que el usuario sea el solicitante o el profesional involucrado
        if solicitud["solicitante_id"] != user_id and solicitud["profesional_id"] != user_id:
            raise HTTPException(status_code=403, detail="No tenés permiso para ver esta solicitud")

        return solicitud

    except Exception as e:
        log.error(f"Error al obtener solicitud por ID: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la solicitud")
