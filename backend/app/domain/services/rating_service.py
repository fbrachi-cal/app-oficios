from app.ports.request_repository import RequestRepository
from app.shared.logger import log
from app.ports.rating_repository import RatingRepository
from app.ports.user_repository import UserRepository

class RatingService:
    def __init__(self, rating_repo: RatingRepository, request_repo: RequestRepository, user_repo: UserRepository):
        self.repo = rating_repo
        self.request_repo = request_repo
        self.user_repo = user_repo

    def calificar_usuario(self, solicitud_id: str, calificador_id: str, calificado_id: str, calificacion: int, observacion: str = ""):
        log.info(f"Buscando si ya calificó: {calificador_id} -> {solicitud_id}")

        if self.repo.obtener_calificacion_por_solicitud_y_usuario(solicitud_id, calificador_id):
            raise Exception("Ya calificaste esta solicitud")
        
        log.info("Buscando solicitud en Firestore...")
        if not calificado_id:
            solicitud = self.request_repo.get_by_id(solicitud_id)
            if not solicitud:
                raise Exception("Solicitud no encontrada")

            if calificador_id == solicitud["solicitante_id"]:
                calificado_id = solicitud["profesional_id"]
            elif calificador_id == solicitud["profesional_id"]:
                calificado_id = solicitud["solicitante_id"]
            else:
                raise Exception("No tenés permiso para calificar esta solicitud")
            
        
        log.info(f"Solicitud obtenida: {solicitud}")
        data = {
            "solicitud_id": solicitud_id,
            "calificador_id": calificador_id,
            "calificado_id": calificado_id,
            "calificacion": calificacion,
            "observacion": observacion,
        }
        self.repo.guardar_calificacion(data)
        
         # Determinar tipo de calificador
        is_cliente = calificador_id == solicitud["solicitante_id"]
        
        # Marcar solicitud como calificada por cliente o profesional
        log.info("VOY A ACTUALIZAR LA SOLICITUD")
        campo = "calificacion_cliente" if is_cliente else "calificacion_profesional"
        self.request_repo.actualizar(solicitud_id, {campo: True})
        
        # Obtener todas las calificaciones del usuario calificado
        todas = self.repo.obtener_calificaciones_por_usuario(calificado_id)
        suma = sum(c.get("calificacion", 0) for c in todas)
        cantidad = len(todas)
        promedio = round(suma / cantidad, 1) if cantidad else 0

        # Actualizar en el perfil del usuario
        self.user_repo.actualizar_campos_usuario(calificado_id, {
            "promedioCalificacion": promedio,
            "cantidadCalificaciones": cantidad
        })
        
        return {"message": "Calificación registrada"}
