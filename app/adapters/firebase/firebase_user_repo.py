from app.ports.user_repository import UserRepository
from app.adapters.firebase.firebase_config import get_firestore

class FirebaseUserRepository(UserRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("usuarios")

    def save_user(self, user_data: dict):
        user_id = user_data.get("id")
        if not user_id:
            raise ValueError("El usuario debe tener un ID")
        self.collection.document(user_id).set(user_data)

    def get_user_by_id(self, user_id: str) -> dict:
        doc = self.collection.document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def buscar_profesionales_multifiltro(
        self,
        zonas: list[str] | None = None,
        oficios: list[str] | None = None
    ):
        query = self.collection.where("tipo", "==", "profesional")

        # Firestore solo permite un array_contains_any. Elegimos uno y el otro lo filtramos en Python
        if zonas:
            query = query.where("zonas", "array_contains_any", zonas)

        resultados = [doc.to_dict() for doc in query.stream()]

        if oficios:
            resultados = [
                prof for prof in resultados
                if any(of in prof.get("oficios", []) for of in oficios)
            ]

        return resultados

    def get_all_users(self):
        return [doc.to_dict() for doc in self.collection.stream()]
