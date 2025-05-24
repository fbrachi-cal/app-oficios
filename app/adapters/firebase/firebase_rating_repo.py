from app.ports.rating_repository import RatingRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.ports.rating_repository import RatingRepository
from datetime import datetime
from firebase_admin import storage, firestore

class FirebaseRatingRepository(RatingRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection("calificaciones")

    def guardar_calificacion(self, data: dict) -> dict:
        doc_ref = self.collection.document()
        data["id"] = doc_ref.id
        data["fecha"] = datetime.utcnow().isoformat()
        doc_ref.set(data)
        return data

    def obtener_calificaciones_por_usuario(self, usuario_id: str) -> list:
        calificaciones = self.collection.where("calificado_id", "==", usuario_id).stream()
        return [doc.to_dict() for doc in calificaciones]

    def obtener_calificacion_por_solicitud_y_usuario(self, solicitud_id: str, calificador_id: str) -> dict:
        query = self.collection.where("solicitud_id", "==", solicitud_id).where("calificador_id", "==", calificador_id).stream()
        for doc in query:
            return doc.to_dict()
        return None
