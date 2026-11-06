from pydantic import BaseModel
from typing import Optional, List

class UsuarioRegistro(BaseModel):
    id: str
    nombre: str
    tipo: str  # "cliente" o "profesional"
    cobertura_ids: Optional[List[str]] = None
    zonas: Optional[List[str]] = None
    categorias: Optional[List[str]] = []
    subcategorias: Optional[List[str]] = None
    foto: Optional[str] = None
    descripcion: Optional[str] = ""
    disponibilidad: Optional[str] = ""
    status: str = "ACTIVE"
    telefono: Optional[str] = None
    oficios: Optional[List[str]] = None
    
class UsuarioUpdate(BaseModel):
    id: Optional[str] = None
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    cobertura_ids: Optional[List[str]] = None
    zonas: Optional[List[str]] = None
    categorias: Optional[List[str]] = []
    subcategorias: Optional[List[str]] = None
    foto: Optional[str] = None
    descripcion: Optional[str] = ""
    disponibilidad: Optional[str] = ""
    telefono: Optional[str] = None
    oficios: Optional[List[str]] = None
    