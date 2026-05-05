from typing import Dict, List
from app.ports.user_repository import UserRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log

class FirebaseUserRepository(UserRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("usuarios")

    def save_user(self, user_data: dict):
        user_id = user_data.get("id")
        if not user_id:
            raise ValueError("El usuario debe tener un ID")
        log.info(f"🔥 Datos que se van a guardar: {user_data}")
        
        # Si es profesional, completar categorías desde subcategorías
        if user_data.get("tipo") == "profesional" and "subcategorias" in user_data:
            subcategorias_usuario = set(user_data["subcategorias"])
            categorias_ref = self.db.collection("categorias").stream()

            mapa_subcat_to_cat = {}
            for doc in categorias_ref:
                cat = doc.to_dict()
                nombre_categoria = cat.get("nombre")
                for sub in cat.get("subcategorias", []):
                    mapa_subcat_to_cat[sub["nombre"]] = nombre_categoria

            categorias_usuario = {
                mapa_subcat_to_cat[sub]
                for sub in subcategorias_usuario
                if sub in mapa_subcat_to_cat
            }

            user_data["categorias"] = list(categorias_usuario)
    
        self.collection.document(user_id).set(user_data)

    def get_user_by_id(self, user_id: str) -> dict:
        doc = self.collection.document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    
    def get_users_by_ids(self, user_ids: List[str]) -> List[Dict]:
        users_ref = self.db.collection("usuarios")
        results = []

        for uid in user_ids:
            doc = users_ref.document(uid).get()
            if doc.exists:
                data = doc.to_dict()
                data["uid"] = doc.id
                results.append(data)

        return results

    def buscar_profesionales(self, zonas: list, categoria: str, subcategorias: list, limit: int = 10, start_after_id: str = None):
        log.info("BUSCAR PROFESIONALES!")
        # 1) Base: sólo profesionales
        query = self.collection.where("tipo", "==", "profesional")

        # 2) Firestore only allows ONE array_contains or array_contains_any per query.
        # We pick the most selective one available for the database query.
        if zonas:
            query = query.where("zonas", "array_contains_any", zonas)
        elif subcategorias:
            query = query.where("subcategorias", "array_contains_any", subcategorias)
        elif categoria:
            query = query.where("categorias", "array_contains", categoria)

        # Order by name in DB
        query = query.order_by("nombre")

        # 3) Fetch all matching the primary filter (needed for accurate in-memory filtering + pagination)
        all_docs = list(query.stream())

        # 4) Filter remaining conditions in memory
        filtered_docs = []
        for doc in all_docs:
            data = doc.to_dict()
            
            if zonas and not any(z in data.get("zonas", []) for z in zonas):
                continue
            if categoria and categoria not in data.get("categorias", []):
                continue
            if subcategorias and not any(sc in data.get("subcategorias", []) for sc in subcategorias):
                continue
                
            filtered_docs.append((doc.id, data))

        # 5) Apply pagination manually
        start_idx = 0
        if start_after_id:
            for i, (doc_id, _) in enumerate(filtered_docs):
                if doc_id == start_after_id:
                    start_idx = i + 1
                    break
                    
        paginated_docs = filtered_docs[start_idx : start_idx + limit]

        # 6) Mapeo al formato de salida
        resultados = []
        for doc_id, data in paginated_docs:
            log.info("calificacion: " + str(data.get("promedioCalificacion", 0)))
            resultados.append({
                "id": doc_id,
                "nombre": data.get("nombre", "Sin nombre"),
                "foto": data.get("foto", ""),
                "categoria": data.get("categoria", []),
                "subcategorias": data.get("subcategorias", []),
                "zonas": data.get("zonas", []),
                "calificacion": data.get("promedioCalificacion", 0),
                "trabajosRealizados": data.get("cantidadCalificaciones", 0),
                "disponibilidad": data.get("disponibilidad", "No especificada"),
            })
            
        return resultados



    def get_all_users(self):
        results = []
        for doc in self.collection.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return results
    
    def actualizar_campos_usuario(self, user_id: str, campos: dict):
        self.collection.document(user_id).update(campos)
