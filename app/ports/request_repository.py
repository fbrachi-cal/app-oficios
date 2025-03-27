from abc import ABC, abstractmethod

class RequestRepository(ABC):
    @abstractmethod
    def save_request(self, request_data: dict):
        pass

    @abstractmethod
    def get_requests_by_user(self, user_id: str) -> list:
        pass
