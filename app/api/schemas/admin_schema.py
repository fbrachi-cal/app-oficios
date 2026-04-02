"""
Pydantic DTOs for the Admin module.
Covers: admin user management, chat listing, and the reports system.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class AdminUserOut(BaseModel):
    """Read-only view of a user exposed to admins."""
    id: str
    nombre: str
    tipo: str  # cliente | profesional | admin | moderator | superadmin
    is_active: bool = True
    deleted_at: Optional[datetime] = None
    foto: Optional[str] = None
    descripcion: Optional[str] = None
    zonas: Optional[List[str]] = []
    categorias: Optional[List[str]] = []
    # Audit fields
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None


class AdminUserPatch(BaseModel):
    """Fields an admin can mutate on a user document."""
    tipo: Optional[str] = None          # role change
    is_active: Optional[bool] = None    # soft disable / re-enable
    deleted_at: Optional[datetime] = None  # soft delete (set to now) or restore (None)


# ---------------------------------------------------------------------------
# Chats (read-only views for admin)
# ---------------------------------------------------------------------------

class AdminChatOut(BaseModel):
    """Summary row of a chat returned to admin."""
    id: str
    participants: List[str]
    lastMessage: Optional[str] = None
    lastMessageAt: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    is_reported: Optional[bool] = False


class AdminMessageOut(BaseModel):
    """A single message inside a chat, read-only for admin."""
    id: str
    senderId: str
    body: str
    sentAt: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

ReportTargetType = Literal["user", "message"]
ReportStatus = Literal["pending", "resolved"]


class ReportCreate(BaseModel):
    """Payload sent by any authenticated user to file a report."""
    target_type: ReportTargetType
    target_id: str = Field(..., description="UID of the reported user or message ID")
    reason: str = Field(..., min_length=5, max_length=500)


class ReportOut(BaseModel):
    """Full report as returned to admins."""
    id: str
    reporter_uid: str
    target_type: ReportTargetType
    target_id: str
    reason: str
    status: ReportStatus = "pending"
    created_at: datetime
    # Audit / resolution fields
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None


class ReportPatch(BaseModel):
    """Fields an admin can modify on a report."""
    status: Optional[ReportStatus] = None
    resolution_notes: Optional[str] = Field(None, max_length=1000)


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginatedResponse(BaseModel):
    """Generic paginated response envelope."""
    items: List
    total: int
    limit: int
    next_cursor: Optional[str] = None  # last document ID for cursor-based pagination


# ---------------------------------------------------------------------------
# Solicitudes
# ---------------------------------------------------------------------------

class AdminRequestMessageCreate(BaseModel):
    """Payload to add a message as admin inside a request interaction thread."""
    mensaje: str = Field(..., min_length=1, max_length=1000)
