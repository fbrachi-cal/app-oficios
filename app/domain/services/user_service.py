from app.api.schemas.user_schema import UsuarioRegistro, UsuarioUpdate
from typing import List

class UserService:
    def __init__(self, user_repository):
        self.user_repository = user_repository

    def registrar_usuario(self, user_data: UsuarioRegistro):
        if not user_data.id or not user_data.nombre:
            raise ValueError("Faltan campos obligatorios")
        self.user_repository.save_user(user_data.dict())

    def obtener_usuario(self, user_id: str) -> dict:
        return self.user_repository.get_user_by_id(user_id)
    
    def buscar_profesionales_multifiltro(self, zonas: List[str], categoria: str, subcategorias: List[str], limit: int = 10, start_after_id: str = None):
        return self.user_repository.buscar_profesionales(zonas, categoria, subcategorias, limit, start_after_id)

    def listar_usuarios(self):
        return self.user_repository.get_all_users()
    
    def actualizar_usuario(self, uid: str, datos: UsuarioUpdate):
        usuario = self.user_repository.get_user_by_id(uid)
        if not usuario:
            return None

        actualizaciones = datos.dict(exclude_unset=True)
        usuario.update(actualizaciones)
        self.user_repository.save_user(usuario)
        return usuario