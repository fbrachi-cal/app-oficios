from abc import ABC, abstractmethod
from typing import List, Dict

class UserRepository(ABC):
    @abstractmethod
    def save_user(self, user_data: dict):
        pass

    @abstractmethod
    def get_user_by_id(self, user_id: str) -> dict:
        pass

    def get_users_by_ids(self, user_ids: List[str]) -> List[Dict]:
        pass        
    
    @abstractmethod
    def actualizar_campos_usuario(self, user_id: str, campos: dict):
        pass