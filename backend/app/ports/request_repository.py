from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class RequestRepository(ABC):
    @abstractmethod
    def save_request(self, request_data: Dict[str, Any]) -> dict:
        pass

    @abstractmethod
    def listar_por_solicitante(self, solicitante_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def listar_por_profesional(self, profesional_id: str) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def get_by_id(self, solicitud_id: str) -> Optional[dict]:
        pass
    
    @abstractmethod
    def actualizar_con_historial(self, solicitud_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def actualizar_con_historial(self, solicitud_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def actualizar(self, solicitud_id: str, update_data: Dict[str, Any]) -> Dict:
        pass

    @abstractmethod
    def get_all_requests(self) -> List[Dict[str, Any]]:
        pass
