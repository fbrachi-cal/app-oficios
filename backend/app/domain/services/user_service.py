from app.api.schemas.user_schema import UsuarioRegistro, UsuarioUpdate
from app.domain.services.geo_service import GeoCatalog, get_geo_catalog
from typing import List, Optional

class UserService:
    def __init__(self, user_repository, geo_catalog: Optional[GeoCatalog] = None):
        self.user_repository = user_repository
        self.geo_catalog = geo_catalog or get_geo_catalog()

    def registrar_usuario(self, user_data: UsuarioRegistro):
        if isinstance(user_data, dict):
            payload = dict(user_data)
        else:
            payload = user_data.dict()

        if not payload.get("id") or not payload.get("nombre"):
            raise ValueError("Faltan campos obligatorios")
            
        existing = self.user_repository.get_user_by_id(payload["id"])
        if existing:
            raise ValueError("El usuario ya se encuentra registrado. No se puede sobrescribir el perfil existente.")

        if payload.get("tipo") == "profesional":
            raw_coverage = payload.get("cobertura_ids")
            if raw_coverage is not None:
                payload["cobertura_ids"] = self.geo_catalog.validate_and_normalize_pro_coverage(raw_coverage)
            elif payload.get("zonas") is not None:
                payload["cobertura_ids"] = self.geo_catalog.validate_and_normalize_pro_coverage(payload["zonas"])
            else:
                raise ValueError("Debes seleccionar al menos una zona de cobertura válida.")
            
        self.user_repository.save_user(payload)

    def obtener_usuario(self, user_id: str) -> dict:
        user = self.user_repository.get_user_by_id(user_id)
        if user:
            return self.geo_catalog.enrich_professional_profile(user)
        return None
    
    def buscar_profesionales_multifiltro(
        self,
        ubicaciones: Optional[List[str]],
        categoria: Optional[str],
        subcategorias: Optional[List[str]],
        limit: int = 10,
        start_after_id: Optional[str] = None,
    ):
        validated_leaves = self.geo_catalog.validate_client_search_locations(ubicaciones)
        return self.user_repository.buscar_profesionales(
            validated_leaves,
            categoria,
            subcategorias,
            limit,
            start_after_id,
        )

    def listar_usuarios(self):
        users = self.user_repository.get_all_users()
        return [self.geo_catalog.enrich_professional_profile(u) for u in users]
    
    def actualizar_usuario(self, uid: str, datos: UsuarioUpdate):
        usuario = self.user_repository.get_user_by_id(uid)
        if not usuario:
            return None

        actualizaciones = datos.dict(exclude_unset=True)
        tipo_final = actualizaciones.get("tipo") or usuario.get("tipo")

        if tipo_final == "profesional":
            if "cobertura_ids" in actualizaciones and actualizaciones["cobertura_ids"] is not None:
                actualizaciones["cobertura_ids"] = self.geo_catalog.validate_and_normalize_pro_coverage(
                    actualizaciones["cobertura_ids"]
                )
            elif "zonas" in actualizaciones and actualizaciones["zonas"] is not None and "cobertura_ids" not in actualizaciones:
                actualizaciones["cobertura_ids"] = self.geo_catalog.validate_and_normalize_pro_coverage(
                    actualizaciones["zonas"]
                )

        usuario.update(actualizaciones)
        self.user_repository.save_user(usuario)
        return self.geo_catalog.enrich_professional_profile(usuario)