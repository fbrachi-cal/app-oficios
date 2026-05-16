from pydantic import BaseModel
from typing import Optional

class ReferralCreate(BaseModel):
    professional_name: str
    professional_phone: Optional[str] = None
    professional_email: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    zone: Optional[str] = None
    comment: Optional[str] = None
    worked_with_before: Optional[bool] = None

class ReferralOut(BaseModel):
    id: str
    client_id: str
    professional_user_id: Optional[str]
    professional_name: str
    professional_phone: Optional[str]
    professional_email: Optional[str]
    normalized_phone: Optional[str]
    normalized_email: Optional[str]
    category: Optional[str]
    subcategory: Optional[str]
    zone: Optional[str]
    comment: Optional[str]
    worked_with_before: Optional[bool]
    status: str
    created_at: str
    updated_at: str
    invited_at: Optional[str]
    linked_at: Optional[str]
    registered_at: Optional[str]
    activated_at: Optional[str]
