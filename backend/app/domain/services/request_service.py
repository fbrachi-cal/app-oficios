from datetime import datetime, timezone, timedelta
from app.ports.request_repository import RequestRepository
from typing import List,Dict,Any,Optional

def _normalizar_fecha(fecha) -> Optional[datetime]:
    if not fecha:
        return None
    if isinstance(fecha, str):
        try:
            fecha = datetime.fromisoformat(fecha.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(fecha, datetime):
        if fecha.tzinfo is None:
            return fecha.replace(tzinfo=timezone.utc)
        return fecha.astimezone(timezone.utc)
    return None

class RequestService:
    def __init__(self, request_repo: RequestRepository):
        self.request_repo = request_repo
        
    
        
    def agregar_consulta(self, solicitud_id: str, user_id: str, mensaje: str, fotos: Optional[List[str]] = None) -> dict:
        solicitud = self.request_repo.get_by_id(solicitud_id)
        if not solicitud:
            raise Exception("Solicitud no encontrada")

        if user_id not in [solicitud["solicitante_id"], solicitud["profesional_id"]]:
            raise Exception("No tenés permiso para comentar en esta solicitud")

        if solicitud["estado"] not in ["creada", "consulta", "aceptada"]:
            raise Exception("No se pueden enviar mensajes en una solicitud finalizada o cancelada")

        consulta = {
            "mensaje": mensaje,
            "usuario_id": user_id,
            "fecha": datetime.utcnow()
        }
        
        if fotos:
            consulta["fotos"] = fotos

        # Si la solicitud está en "creada" y responde el profesional, cambiar a "consulta"
        update_data = {}
        if solicitud["estado"] == "creada" and user_id == solicitud["profesional_id"]:
            update_data["estado"] = "consulta"
            update_data["fecha_cambio_estado"] = datetime.utcnow()

        return self.request_repo.agregar_a_array(solicitud_id, "historial_consultas", consulta, update_data)
        
    def actualizar_estado_y_respuesta_profesional(
        self,
        solicitud_id: str,
        nuevo_estado: str,
        fechas_propuestas: List[str],
        observacion: str,
        user_id: str
    ) -> Dict[str, Any]:
        ahora = datetime.utcnow()
        solicitud = self.request_repo.get_by_id(solicitud_id)
        if not solicitud:
            raise Exception("Solicitud no encontrada")

        if solicitud["profesional_id"] != user_id:
            raise Exception("No estás autorizado para responder esta solicitud")

        update_data = {
            "estado": nuevo_estado,
            "fecha_cambio_estado": ahora,
            "fechas_propuestas": fechas_propuestas,
            "observacion_profesional": observacion,
            "historial_estados": {
                "estado": nuevo_estado,
                "fecha": ahora
            }
        }

        return self.request_repo.actualizar_con_historial(solicitud_id, update_data)
        
    async def listar_solicitudes_por_solicitante(self, user_id: str) -> List[Dict[str, Any]]:
        return self.request_repo.listar_por_solicitante(user_id)

    async def listar_solicitudes_por_profesional(self, user_id: str) -> List[Dict[str, Any]]:
        return self.request_repo.listar_por_profesional(user_id)

    async def crear_solicitud(
        self,
        solicitante_id: str,
        profesional_id: str,
        zona: str,
        subcategoria: str,
        descripcion: str,
        fotos_urls: List[str]
    ) -> dict:
        solicitud_data = {
            "solicitante_id": solicitante_id,
            "profesional_id": profesional_id,
            "zona": zona,
            "estado": "creada", 
            "subcategoria": subcategoria,
            "descripcion": descripcion,
            "fotos": fotos_urls,
            "fecha_creacion": datetime.utcnow(),
            "fecha_cambio_estado": datetime.utcnow(),
            "historial_estados": [{
                "estado": "creada",
                "fecha": datetime.utcnow()
            }]
        }
        return await self.request_repo.save_request(solicitud_data)
    
    def cambiar_estado(self, solicitud_id: str, user_id: str, nuevo_estado: str, motivo: Optional[str] = None, observacion: Optional[str] = None) -> dict:
        solicitud = self.request_repo.get_by_id(solicitud_id)
        if not solicitud:
            raise Exception("Solicitud no encontrada")

        # Validación básica: solo los participantes pueden cambiar el estado
        if user_id not in [solicitud["solicitante_id"], solicitud["profesional_id"]]:
            raise Exception("No tenés permiso para modificar esta solicitud")

        # Validation for cancellation:
        if nuevo_estado in ["cancelada", "rechazada"]:
            if solicitud["estado"] not in ["creada", "consulta", "aceptada"]:
                raise Exception("No se puede cancelar una solicitud que no está activa")
        else:
            if solicitud["estado"] in ["verificada", "calificada", "confirmada"]:
                raise Exception("No se puede modificar una solicitud ya finalizada o verificada")

        ahora = datetime.utcnow()
        update_data = {
            "estado": nuevo_estado,
            "fecha_cambio_estado": ahora,
            "historial_estados": {
                "estado": nuevo_estado,
                "fecha": ahora
            }
        }
        if motivo:
            update_data["motivo_cancelacion"] = motivo
        if observacion:
            update_data["observacion_cancelacion"] = observacion
        
        return self.request_repo.actualizar_con_historial(solicitud_id, update_data)

    def calcular_eligibilidad_verificacion(self, solicitud: dict, user_id: str) -> bool:
        if solicitud.get("estado") not in ["creada", "consulta", "aceptada"]:
            return False

        client_id = solicitud.get("solicitante_id")
        pro_id = solicitud.get("profesional_id")
        if user_id not in [client_id, pro_id]:
            return False

        ahora = datetime.now(timezone.utc)

        real_messages = []
        for msg in solicitud.get("historial_consultas", []):
            msg_usuario = msg.get("usuario_id")
            if msg_usuario in [client_id, pro_id]:
                if msg.get("tipo") != "admin" and msg.get("rol") != "admin":
                    real_messages.append(msg)

        def get_fecha_key(m):
            f = _normalizar_fecha(m.get("fecha"))
            return f if f else datetime.min.replace(tzinfo=timezone.utc)
        real_messages.sort(key=get_fecha_key)

        num_interactions = len(real_messages)

        if num_interactions > 0:
            last_interaction_time = _normalizar_fecha(real_messages[-1].get("fecha"))
        else:
            last_interaction_time = _normalizar_fecha(solicitud.get("fecha_creacion"))

        if not last_interaction_time:
            last_interaction_time = ahora

        trigger_messages = num_interactions > 4
        trigger_time = (ahora - last_interaction_time) >= timedelta(days=2)

        if not (trigger_messages or trigger_time):
            return False

        if user_id == client_id:
            no_prompt_at = _normalizar_fecha(solicitud.get("no_prompt_client_at"))
        else:
            no_prompt_at = _normalizar_fecha(solicitud.get("no_prompt_professional_at"))

        if not no_prompt_at:
            return True

        has_new_message = False
        for msg in real_messages:
            msg_fecha = _normalizar_fecha(msg.get("fecha"))
            if msg_fecha and msg_fecha > no_prompt_at:
                has_new_message = True
                break

        has_time_passed = (ahora - no_prompt_at) >= timedelta(days=2)

        return has_new_message or has_time_passed

    def responder_verificacion(self, solicitud_id: str, user_id: str, respuesta: str) -> dict:
        solicitud = self.request_repo.get_by_id(solicitud_id)
        if not solicitud:
            raise Exception("Solicitud no encontrada")

        client_id = solicitud.get("solicitante_id")
        pro_id = solicitud.get("profesional_id")
        if user_id not in [client_id, pro_id]:
            raise Exception("No tenés permiso para responder la verificación de esta solicitud")

        if respuesta.lower() == "si":
            return self.request_repo.responder_verificacion_si_transaccional(solicitud_id, user_id)
        elif respuesta.lower() == "no":
            if solicitud.get("estado") not in ["creada", "consulta", "aceptada"]:
                raise Exception("Solo se pueden verificar solicitudes activas")
            
            ahora = datetime.utcnow()
            campo_no = "no_prompt_client_at" if user_id == client_id else "no_prompt_professional_at"
            self.request_repo.actualizar(solicitud_id, {campo_no: ahora})
            
            # Fetch updated doc
            updated_solicitud = self.request_repo.get_by_id(solicitud_id)
            return {"solicitud": updated_solicitud, "ofrecer_calificacion": False}
        else:
            raise Exception("Respuesta inválida")
