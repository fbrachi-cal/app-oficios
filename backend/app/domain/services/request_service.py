from datetime import datetime
from app.ports.request_repository import RequestRepository
from typing import List,Dict,Any,Optional

class RequestService:
    def __init__(self, request_repo: RequestRepository):
        self.request_repo = request_repo
        
    
        
    def agregar_consulta(self, solicitud_id: str, user_id: str, mensaje: str, fotos: Optional[List[str]] = None) -> dict:
        solicitud = self.request_repo.get_by_id(solicitud_id)
        if not solicitud:
            raise Exception("Solicitud no encontrada")

        if user_id not in [solicitud["solicitante_id"], solicitud["profesional_id"]]:
            raise Exception("No tenés permiso para comentar en esta solicitud")

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

        # Validar estado permitido si querés (opcional)
        ahora=datetime.utcnow()
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
