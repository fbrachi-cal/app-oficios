"""
Pydantic schemas for gamification API responses.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class LevelOut(BaseModel):
    id: str
    program_id: str
    code: str
    name: str
    level_order: int
    rules: List[Dict[str, Any]]
    rules_mode: str


class ProfileOut(BaseModel):
    user_id: str
    program_id: str
    current_level_id: str
    current_level_code: str
    current_level_order: int
    last_evaluated_at: str
    last_level_up_at: str
    metrics_snapshot: Dict[str, Any]
    created_at: str
    updated_at: str


class ProgressItem(BaseModel):
    metric: str
    current: Any
    required: Any
    met: bool


class EventOut(BaseModel):
    id: str
    user_id: str
    event_type: str
    program_id: str
    from_level_code: Optional[str]
    to_level_code: Optional[str]
    seen: bool
    created_at: str
    seen_at: Optional[str]
    payload: Optional[Dict[str, Any]]


class GamificationMeOut(BaseModel):
    profile: Optional[ProfileOut]
    current_level: Optional[LevelOut]
    next_level: Optional[LevelOut]
    progress: List[ProgressItem]
    pending_event: Optional[EventOut]
