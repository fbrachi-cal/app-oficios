from pydantic import BaseModel
from typing import List, Optional

class FiltroBusquedaProfesionales(BaseModel):
    zonas: Optional[List[str]] = None
    categoria: Optional[str] = None
    subcategorias: Optional[List[str]] = None
    limit: Optional[int] = 5
    start_after_id: Optional[str] = None