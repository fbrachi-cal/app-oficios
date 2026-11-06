from pydantic import BaseModel
from typing import List, Optional

class FiltroBusquedaProfesionales(BaseModel):
    ubicaciones: Optional[List[str]] = None
    zonas: Optional[List[str]] = None
    categoria: Optional[str] = None
    subcategorias: Optional[List[str]] = None
    limit: Optional[int] = 12
    start_after_id: Optional[str] = None