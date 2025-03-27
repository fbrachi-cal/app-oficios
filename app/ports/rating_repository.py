from abc import ABC, abstractmethod

class RatingRepository(ABC):
    @abstractmethod
    def save_rating(self, rating_data: dict):
        pass

    @abstractmethod
    def get_ratings_by_professional(self, profesional_id: str) -> list:
        pass
