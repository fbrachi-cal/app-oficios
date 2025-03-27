from pydantic import BaseModel

class SolicitudRegistro(BaseModel):
    id: str
    cliente_id: str
    profesional_id: str
    descripcion: str
    estado: str
