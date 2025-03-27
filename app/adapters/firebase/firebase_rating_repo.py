from app.ports.rating_repository import RatingRepository
from app.adapters.firebase.firebase_config import get_firestore

class FirebaseRatingRepository(RatingRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("calificaciones")

    def save_rating(self, rating_data: dict):
        rating_id = rating_data.get("id")
        if not rating_id:
            raise ValueError("La calificación debe tener un ID")
        self.collection.document(rating_id).set(rating_data)

    def get_ratings_by_professional(self, profesional_id: str) -> list:
        docs = self.collection.where("profesional_id", "==", profesional_id).stream()
        return [doc.to_dict() for doc in docs]
