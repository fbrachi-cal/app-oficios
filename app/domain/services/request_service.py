class RequestService:
    def __init__(self, request_repository):
        self.request_repository = request_repository

    def crear_solicitud(self, request_data: dict):
        if "id" not in request_data or "cliente_id" not in request_data or "profesional_id" not in request_data:
            raise ValueError("Faltan campos obligatorios")
        self.request_repository.save_request(request_data)

    def obtener_solicitudes_por_usuario(self, user_id: str) -> list:
        return self.request_repository.get_requests_by_user(user_id)
