from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime

class StatusHistoryEntry(BaseModel):
    status: str
    date: datetime
    
class CVUploadData(BaseModel):
    candidate_name: str
    email: Optional[str] = None
    phone: str
    tags: List[str] = []
    skills: List[str] = []
    seniority: str = "Junior"
    notes: Optional[str] = None
    source: str = "Direct"

class CVUpdateData(BaseModel):
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    seniority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None

class CV(BaseModel):
    id: str  # ID generated before save
    candidate_name: str
    email: Optional[str] = None
    phone: str
    file_url: str
    file_name: str
    storage_path: str
    content_type: str
    size_bytes: int
    uploaded_by: str
    created_at: datetime
    updated_at: datetime
    tags: List[str] = []
    skills: List[str] = []
    seniority: str = "Junior"
    status: str = "New"
    status_history: List[StatusHistoryEntry] = []
    notes: str = ""
    source: str = "Direct"
    search_text: str = ""
    cv_text: str = ""

    model_config = ConfigDict(from_attributes=True)
