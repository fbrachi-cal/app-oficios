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