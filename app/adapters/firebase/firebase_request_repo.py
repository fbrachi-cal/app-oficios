from app.ports.request_repository import RequestRepository
from app.adapters.firebase.firebase_config import get_firestore

class FirebaseRequestRepository(RequestRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("solicitudes")

    def save_request(self, request_data: dict):
        request_id = request_data.get("id")
        if not request_id:
            raise ValueError("La solicitud debe tener un ID")
        self.collection.document(request_id).set(request_data)

    def get_requests_by_user(self, user_id: str) -> list:
        docs = self.collection.where("cliente_id", "==", user_id).stream()
        return [doc.to_dict() for doc in docs]
