from typing import Dict, List, Optional
from app.ports.user_repository import UserRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.domain.services.geo_service import GeoCatalog, get_geo_catalog
from app.shared.logger import log


def _chunked(seq: List[str], size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


class FirebaseUserRepository(UserRepository):
    def __init__(self, geo_catalog: Optional[GeoCatalog] = None):
        self.db = get_firestore()
        self.collection = self.db.collection("usuarios")
        self.geo_catalog = geo_catalog or get_geo_catalog()

    def save_user(self, user_data: dict):
        user_id = user_data.get("id")
        if not user_id:
            raise ValueError("El usuario debe tener un ID")
            
        # Align oficios and subcategorias for professional users
        if user_data.get("tipo") == "profesional":
            if "oficios" in user_data and user_data["oficios"] and ("subcategorias" not in user_data or not user_data["subcategorias"]):
                user_data["subcategorias"] = user_data["oficios"]
            elif "subcategorias" in user_data and user_data["subcategorias"] and ("oficios" not in user_data or not user_data["oficios"]):
                user_data["oficios"] = user_data["subcategorias"]

            if "cobertura_ids" in user_data and user_data["cobertura_ids"] is not None:
                normalized_ids = self.geo_catalog.validate_and_normalize_pro_coverage(user_data["cobertura_ids"])
                user_data["cobertura_ids"] = normalized_ids
                user_data["cobertura_version"] = self.geo_catalog.version
                
        log.info(f"🔥 Datos que se van a guardar: {user_data}")
        
        # Si es profesional, completar categorías desde subcategorías
        if user_data.get("tipo") == "profesional" and "subcategorias" in user_data and user_data["subcategorias"]:
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

    def buscar_profesionales(
        self,
        ubicaciones: list,
        categoria: str,
        subcategorias: list,
        limit: int = 10,
        start_after_id: str = None,
    ):
        log.info("BUSCAR PROFESIONALES!")
        validated_leaves, leaf_ancestor_sets, query_tokens = self.geo_catalog.build_search_query_tokens(
            ubicaciones or []
        )
        K = len(validated_leaves)

        base_query = self.collection.where("tipo", "==", "profesional")
        candidates: Dict[str, dict] = {}

        if K > 0:
            # Query Firestore using chunks of <= 30 covering IDs (self + selectable ancestors)
            for chunk in _chunked(query_tokens, 30):
                q = base_query.where("cobertura_ids", "array_contains_any", chunk)
                for doc in q.stream():
                    candidates[doc.id] = doc.to_dict()
        else:
            # Unfiltered by location: use subcategorias / categoria filter in DB if provided
            q = base_query
            if subcategorias:
                q = q.where("subcategorias", "array_contains_any", subcategorias)
            elif categoria:
                q = q.where("categorias", "array_contains", categoria)
            for doc in q.stream():
                candidates[doc.id] = doc.to_dict()

        # Filter, compute exact coverage match count, and score in memory
        scored_docs = []
        for doc_id, data in candidates.items():
            if data.get("status", "ACTIVE") != "ACTIVE" or not data.get("is_active", True):
                continue

            valid_pro_cov = self.geo_catalog.filter_valid_pro_coverage(data.get("cobertura_ids"))
            # Professionals without valid coverage under the catalog must never appear in searches
            if not valid_pro_cov:
                continue

            if categoria and categoria not in data.get("categorias", []):
                continue
            if subcategorias and not any(sc in data.get("subcategorias", []) for sc in subcategorias):
                continue

            if K > 0:
                matched_ids = self.geo_catalog.compute_matched_locations(
                    valid_pro_cov, validated_leaves, leaf_ancestor_sets
                )
                match_count = len(matched_ids)
                if match_count == 0:
                    continue
            else:
                matched_ids = []
                match_count = 0

            calificacion = float(data.get("promedioCalificacion") or 0)
            nombre = data.get("nombre", "Sin nombre")
            sort_key = (-match_count, -calificacion, nombre.lower(), doc_id)
            scored_docs.append((sort_key, doc_id, data, valid_pro_cov, matched_ids, match_count))

        # Deterministic sort:
        # 1) matched_locations_count DESC
        # 2) promedioCalificacion DESC
        # 3) nombre.lower() ASC
        # 4) doc_id ASC
        scored_docs.sort(key=lambda item: item[0])

        # Apply cursor pagination
        start_idx = 0
        if start_after_id:
            for i, (_, doc_id, *_) in enumerate(scored_docs):
                if doc_id == start_after_id:
                    start_idx = i + 1
                    break

        paginated_docs = scored_docs[start_idx : start_idx + limit]

        resultados = []
        for _, doc_id, data, valid_pro_cov, matched_ids, match_count in paginated_docs:
            cobertura_nombres = [self.geo_catalog.display_name(cid) for cid in valid_pro_cov]
            matched_nombres = [self.geo_catalog.display_name(lid) for lid in matched_ids]
            resultados.append({
                "id": doc_id,
                "nombre": data.get("nombre", "Sin nombre"),
                "foto": data.get("foto", ""),
                "categoria": data.get("categoria", data.get("categorias", [])),
                "subcategorias": data.get("subcategorias", []),
                "cobertura_ids": valid_pro_cov,
                "cobertura_nombres": cobertura_nombres,
                "zonas": cobertura_nombres,
                "matched_location_ids": matched_ids,
                "matched_location_names": matched_nombres,
                "matched_locations_count": match_count,
                "total_searched_locations": K,
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
