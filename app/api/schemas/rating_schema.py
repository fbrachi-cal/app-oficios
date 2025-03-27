from pydantic import BaseModel
from typing import Optional

class CalificacionRegistro(BaseModel):
    id: str
    cliente_id: str
    profesional_id: str
    puntuacion: int
    comentario: Optional[str] = None
