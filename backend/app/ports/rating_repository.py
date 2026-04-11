from abc import ABC, abstractmethod
from typing import Optional, List


class RatingRepository(ABC):
    @abstractmethod
    def guardar_calificacion(self, data: dict) -> dict:
        pass

    @abstractmethod
    def obtener_calificaciones_por_usuario(self, usuario_id: str) -> List[dict]:
        pass

    @abstractmethod
    def obtener_calificacion_por_solicitud_y_usuario(self, solicitud_id: str, calificador_id: str) -> Optional[dict]:
        pass

    @abstractmethod
    def list_ratings_admin(self, limit: int = 20, status_filter: Optional[str] = None, start_after_id: Optional[str] = None) -> List[dict]:
        pass

    @abstractmethod
    def list_ratings_admin(self, limit: int = 20, status_filter: Optional[str] = None, start_after_id: Optional[str] = None) -> List[dict]:
        pass

    @abstractmethod
    def get_rating_by_id(self, rating_id: str) -> Optional[dict]:
        pass

    @abstractmethod
    def create_rating_and_stats_transactional(self, rating_data: dict, calificado_id: str, score: int) -> str:
        pass

    @abstractmethod
    def update_rating_and_stats_transactional(self, rating_id: str, rating_data: dict, calificado_id: Optional[str], old_score: int, new_score: Optional[int], is_delete: bool = False) -> None:
        pass