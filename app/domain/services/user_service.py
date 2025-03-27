class UserService:
    def __init__(self, user_repository):
        self.user_repository = user_repository

    def registrar_usuario(self, user_data: dict):
        if "id" not in user_data or "nombre" not in user_data:
            raise ValueError("Faltan campos obligatorios")
        self.user_repository.save_user(user_data)

    def obtener_usuario(self, user_id: str) -> dict:
        return self.user_repository.get_user_by_id(user_id)
    
    def buscar_profesionales_multifiltro(self, zonas: list[str], oficios: list[str]):
        return self.user_repository.buscar_profesionales_multifiltro(zonas, oficios)

    def listar_usuarios(self):
        return self.user_repository.get_all_users()