from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    def save_user(self, user_data: dict):
        pass

    @abstractmethod
    def get_user_by_id(self, user_id: str) -> dict:
        pass
