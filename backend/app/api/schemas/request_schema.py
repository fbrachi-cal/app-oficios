from pydantic import BaseModel
from typing import List, Optional

class SolicitudRegistro(BaseModel):
    id: str
    cliente_id: str
    profesional_id: str
    descripcion: str
    estado: str

class ConsultaRequest(BaseModel):
    mensaje: str
    fotos: Optional[List[str]] = None
    
class EstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None
    observacion: Optional[str] = None

class RespuestaVerificacion(BaseModel):
    respuesta: str
    motivo: Optional[str] = None
    observacion: Optional[str] = None
