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
        log.info(f"Calificando solicitud: {solicitud_id} por calificador: {calificador_id}")
        
        res = self.repo.crear_calificacion_y_actualizar_estado_transaccional(
            solicitud_id=solicitud_id,
            calificador_id=calificador_id,
            calificacion=calificacion,
            observacion=observacion
        )
        
        return {"message": "Calificación registrada", "rating_id": res["rating_id"], "calificado_id": res["calificado_id"]}
