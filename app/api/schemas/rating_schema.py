from pydantic import BaseModel, Field
from typing import Optional

class RatingRequest(BaseModel):
    solicitud_id: str    
    calificacion: int = Field(..., ge=1, le=5)
    observacion: Optional[str] = ""
    calificado_id: Optional[str] = None
