from pydantic import BaseModel
from typing import Optional, List

class UsuarioRegistro(BaseModel):
    id: str
    nombre: str
    tipo: str  # "cliente" o "profesional"
    zonas: Optional[List[str]] = None
    oficios: Optional[List[str]] = None