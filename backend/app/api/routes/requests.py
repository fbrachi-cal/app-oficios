from app.api.schemas.request_schema import ConsultaRequest, EstadoRequest, RespuestaVerificacion
from app.domain.services.request_service import RequestService
from app.ports.request_repository import RequestRepository
from app.ports.rating_repository import RatingRepository
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Body
from typing import List
from app.api.dependencies import get_current_verified_user_id, get_request_repo, get_user_repo, get_file_uploader, get_notification_service, get_calificacion_repo
from app.domain.services.notification_service import NotificationService
from app.shared.logger import log
from app.ports.user_repository import UserRepository
from app.ports.file_uploader import FileUploader


router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])

@router.patch("/{id}/estado")
async def actualizar_estado_solicitud(
    id: str,
    estado_request: EstadoRequest,
    user_id: str = Depends(get_current_verified_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
):
    try:
        service = RequestService(request_repo)
        res = service.cambiar_estado(id, user_id, estado_request.nuevo_estado, motivo=estado_request.motivo,
            observacion=estado_request.observacion)
        
        try:
            solicitud = request_repo.get_by_id(id)
            if solicitud:
                recipient_uid = (
                    solicitud["profesional_id"]
                    if user_id == solicitud["solicitante_id"]
                    else solicitud["solicitante_id"]
                )
                sender = user_repo.get_user_by_id(user_id)
                sender_name = sender.get("nombre", "Un usuario") if sender else "Un usuario"
                
                if estado_request.nuevo_estado == "cancelada":
                    notif_type = "request_cancelled"
                    notif_title = "Solicitud cancelada"
                    notif_body = f"{sender_name} ha cancelado la solicitud."
                else:
                    notif_type = "request_updated"
                    notif_title = "Actualización de solicitud"
                    notif_body = f"La solicitud ha cambiado de estado a {estado_request.nuevo_estado}."
                    
                await notification_service.create_and_send_notification(
                    recipient_uid=recipient_uid,
                    actor_uid=user_id,
                    type=notif_type,
                    title=notif_title,
                    body=notif_body,
                    related_entity_type="request",
                    related_entity_id=id
                )
        except Exception as notif_err:
            log.error(f"Error sending request state update notification: {notif_err}")

        return res
    except Exception as e:
        log.error(f"Error al cambiar estado de solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}/consultar")
async def agregar_consulta_a_solicitud(
    id: str,
    consulta: ConsultaRequest,
    user_id: str = Depends(get_current_verified_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
):
    try:
        service = RequestService(request_repo)
        res = service.agregar_consulta(id, user_id, consulta.mensaje, consulta.fotos)
        
        # Trigger message received notification for request query/comment
        try:
            solicitud = request_repo.get_by_id(id)
            if solicitud:
                recipient_uid = (
                    solicitud["profesional_id"]
                    if user_id == solicitud["solicitante_id"]
                    else solicitud["solicitante_id"]
                )
                sender = user_repo.get_user_by_id(user_id)
                sender_name = sender.get("nombre", "Usuario") if sender else "Usuario"
                await notification_service.create_and_send_notification(
                    recipient_uid=recipient_uid,
                    actor_uid=user_id,
                    type="chat_message",
                    title="Nuevo mensaje en solicitud",
                    body=f"{sender_name}: {consulta.mensaje}",
                    related_entity_type="request",
                    related_entity_id=id
                )
        except Exception as notif_err:
            log.error(f"Error sending query notification: {notif_err}")

        return res
    except Exception as e:
        log.error(f"Error al agregar consulta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mis")
async def listar_mis_solicitudes(
    user_id: str = Depends(get_current_verified_user_id),
    user_repo: UserRepository = Depends(get_user_repo),
    request_repo: RequestRepository = Depends(get_request_repo),
    rating_repo: RatingRepository = Depends(get_calificacion_repo),
):
    try:
        user = user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        log.info(f"🔍 Obteniendo solicitudes para usuario {user_id} ({user['tipo']})")

        service = RequestService(request_repo)

        if user["tipo"] == "cliente":
            solicitudes = await service.listar_solicitudes_por_solicitante(user_id)
        elif user["tipo"] == "profesional":
            solicitudes = await service.listar_solicitudes_por_profesional(user_id)
        else:
            raise HTTPException(status_code=400, detail="Tipo de usuario no válido")

        solicitud_ids = [s["id"] for s in solicitudes]
        ratings = rating_repo.obtener_calificaciones_por_solicitudes(solicitud_ids)
        ratings_map = {(r["solicitud_id"], r["calificador_id"]): True for r in ratings}

        for s in solicitudes:
            s["confirmo_realizacion_cliente"] = bool(s.get("confirmo_realizacion_cliente") or (s.get("verificado_por") == s["solicitante_id"]))
            s["confirmo_realizacion_profesional"] = bool(s.get("confirmo_realizacion_profesional") or (s.get("verificado_por") == s["profesional_id"]))
            s["califico_cliente"] = (s["id"], s["solicitante_id"]) in ratings_map
            s["califico_profesional"] = (s["id"], s["profesional_id"]) in ratings_map
            s["mostrar_prompt_verificacion"] = service.calcular_eligibilidad_verificacion(s, user_id)
            if user_repo and hasattr(user_repo, "get_user_by_id"):
                solic_user = user_repo.get_user_by_id(s["solicitante_id"])
                prof_user = user_repo.get_user_by_id(s["profesional_id"])
                if solic_user and isinstance(solic_user, dict):
                    s["solicitante_nombre"] = solic_user.get("nombre")
                if prof_user and isinstance(prof_user, dict):
                    s["profesional_nombre"] = prof_user.get("nombre")

        return solicitudes
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
    user_id: str = Depends(get_current_verified_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    uploader: FileUploader = Depends(get_file_uploader), 
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
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

    # Trigger professional contacted notification
    try:
        client = user_repo.get_user_by_id(user_id)
        client_name = client.get("nombre", "Un cliente") if client else "Un cliente"
        await notification_service.create_and_send_notification(
            recipient_uid=profesional_id,
            actor_uid=user_id,
            type="request_created",
            title="Nueva solicitud de servicio",
            body=f"{client_name} te ha enviado una solicitud de {subcategoria} en {zona}.",
            related_entity_type="request",
            related_entity_id=solicitud["id"]
        )
    except Exception as e:
        log.error(f"Error sending professional contacted notification from request: {e}")

    return {"message": "Solicitud guardada", "data": solicitud}


@router.get("/{id}")
async def obtener_solicitud_por_id(
    id: str,
    user_id: str = Depends(get_current_verified_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    rating_repo: RatingRepository = Depends(get_calificacion_repo),
    user_repo: UserRepository = Depends(get_user_repo),
):
    try:
        solicitud = request_repo.get_by_id(id)

        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        # Asegurar que el usuario sea el solicitante o el profesional involucrado
        if solicitud["solicitante_id"] != user_id and solicitud["profesional_id"] != user_id:
            raise HTTPException(status_code=403, detail="No tenés permiso para ver esta solicitud")

        service = RequestService(request_repo)
        solicitud["confirmo_realizacion_cliente"] = bool(solicitud.get("confirmo_realizacion_cliente") or (solicitud.get("verificado_por") == solicitud["solicitante_id"]))
        solicitud["confirmo_realizacion_profesional"] = bool(solicitud.get("confirmo_realizacion_profesional") or (solicitud.get("verificado_por") == solicitud["profesional_id"]))
        solicitud["califico_cliente"] = rating_repo.obtener_calificacion_por_solicitud_y_usuario(id, solicitud["solicitante_id"]) is not None
        solicitud["califico_profesional"] = rating_repo.obtener_calificacion_por_solicitud_y_usuario(id, solicitud["profesional_id"]) is not None
        solicitud["mostrar_prompt_verificacion"] = service.calcular_eligibilidad_verificacion(solicitud, user_id)

        if user_repo and hasattr(user_repo, "get_user_by_id"):
            solic_user = user_repo.get_user_by_id(solicitud["solicitante_id"])
            prof_user = user_repo.get_user_by_id(solicitud["profesional_id"])
            if solic_user and isinstance(solic_user, dict):
                solicitud["solicitante_nombre"] = solic_user.get("nombre")
            if prof_user and isinstance(prof_user, dict):
                solicitud["profesional_nombre"] = prof_user.get("nombre")

        return solicitud

    except Exception as e:
        log.error(f"Error al obtener solicitud por ID: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la solicitud")


@router.patch("/{id}/responder-verificacion")
async def responder_verificacion(
    id: str,
    datos: RespuestaVerificacion,
    user_id: str = Depends(get_current_verified_user_id),
    request_repo: RequestRepository = Depends(get_request_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    notification_service: NotificationService = Depends(get_notification_service),
):
    try:
        service = RequestService(request_repo)
        res = service.responder_verificacion(id, user_id, datos.respuesta, motivo=datos.motivo, observacion=datos.observacion)
        
        # Trigger job_verified notification to counterpart if yes and it's newly verified
        if datos.respuesta.lower() == "si" and res.get("ofrecer_calificacion") and not res.get("already_done", False):
            try:
                solicitud = request_repo.get_by_id(id)
                if solicitud:
                    recipient_uid = (
                        solicitud["profesional_id"]
                        if user_id == solicitud["solicitante_id"]
                        else solicitud["solicitante_id"]
                    )
                    sender = user_repo.get_user_by_id(user_id)
                    sender_name = sender.get("nombre", "Un usuario") if sender else "Un usuario"
                    
                    await notification_service.create_and_send_notification(
                        recipient_uid=recipient_uid,
                        actor_uid=user_id,
                        type="job_verified",
                        title="Trabajo completado",
                        body=f"{sender_name} ha verificado que el trabajo de {solicitud.get('subcategoria')} fue completado.",
                        related_entity_type="request",
                        related_entity_id=id
                    )
            except Exception as notif_err:
                log.error(f"Error sending verification notification: {notif_err}")
        elif datos.respuesta.lower() == "no" and res.get("solicitud", {}).get("estado") == "cancelada":
            try:
                solicitud = res.get("solicitud") or request_repo.get_by_id(id)
                if solicitud:
                    recipient_uid = (
                        solicitud["profesional_id"]
                        if user_id == solicitud["solicitante_id"]
                        else solicitud["solicitante_id"]
                    )
                    sender = user_repo.get_user_by_id(user_id)
                    sender_name = sender.get("nombre", "Un usuario") if sender else "Un usuario"
                    
                    await notification_service.create_and_send_notification(
                        recipient_uid=recipient_uid,
                        actor_uid=user_id,
                        type="request_cancelled",
                        title="Solicitud cancelada",
                        body=f"{sender_name} ha cancelado la solicitud.",
                        related_entity_type="request",
                        related_entity_id=id
                    )
            except Exception as notif_err:
                log.error(f"Error sending verification cancellation notification: {notif_err}")
                
        # Enrich returning solicitud dictionary with rating & confirmation flags and prompt eligibility
        if res.get("solicitud"):
            solicitud_dict = res["solicitud"]
            solicitud_dict["confirmo_realizacion_cliente"] = bool(solicitud_dict.get("confirmo_realizacion_cliente") or (solicitud_dict.get("verificado_por") == solicitud_dict.get("solicitante_id")))
            solicitud_dict["confirmo_realizacion_profesional"] = bool(solicitud_dict.get("confirmo_realizacion_profesional") or (solicitud_dict.get("verificado_por") == solicitud_dict.get("profesional_id")))
            if get_calificacion_repo:
                rating_repo = get_calificacion_repo()
                solicitud_dict["califico_cliente"] = rating_repo.obtener_calificacion_por_solicitud_y_usuario(id, solicitud_dict["solicitante_id"]) is not None
                solicitud_dict["califico_profesional"] = rating_repo.obtener_calificacion_por_solicitud_y_usuario(id, solicitud_dict["profesional_id"]) is not None
            solicitud_dict["mostrar_prompt_verificacion"] = service.calcular_eligibilidad_verificacion(solicitud_dict, user_id)
            if user_repo and hasattr(user_repo, "get_user_by_id"):
                solic_user = user_repo.get_user_by_id(solicitud_dict["solicitante_id"])
                prof_user = user_repo.get_user_by_id(solicitud_dict["profesional_id"])
                if solic_user and isinstance(solic_user, dict):
                    solicitud_dict["solicitante_nombre"] = solic_user.get("nombre")
                if prof_user and isinstance(prof_user, dict):
                    solicitud_dict["profesional_nombre"] = prof_user.get("nombre")

        return res
    except Exception as e:
        log.error(f"Error al responder verificacion: {e}")
        # Idempotency safety fallback: if yes response fails because request is already confirmed
        if datos.respuesta.lower() == "si":
            try:
                solicitud = request_repo.get_by_id(id)
                if solicitud:
                    is_client = user_id == solicitud.get("solicitante_id")
                    already_confirmed = (
                        solicitud.get("confirmo_realizacion_cliente") if is_client
                        else solicitud.get("confirmo_realizacion_profesional")
                    )
                    if already_confirmed is None:
                        already_confirmed = (solicitud.get("verificado_por") == user_id)
                    if already_confirmed:
                        service = RequestService(request_repo)
                        solicitud["confirmo_realizacion_cliente"] = bool(solicitud.get("confirmo_realizacion_cliente") or (solicitud.get("verificado_por") == solicitud.get("solicitante_id")))
                        solicitud["confirmo_realizacion_profesional"] = bool(solicitud.get("confirmo_realizacion_profesional") or (solicitud.get("verificado_por") == solicitud.get("profesional_id")))
                        solicitud["mostrar_prompt_verificacion"] = False
                        return {"solicitud": solicitud, "ofrecer_calificacion": True, "already_done": True}
            except Exception as inner_e:
                log.error(f"Error in idempotency fallback check: {inner_e}")
        raise HTTPException(status_code=400, detail=str(e))

