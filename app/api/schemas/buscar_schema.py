from pydantic import BaseModel
from typing import List, Optional

class FiltroBusquedaProfesionales(BaseModel):
    zonas: Optional[List[str]] = None
    oficios: Optional[List[str]] = None
