"""
Admin router.
All endpoints under /admin/* require role 'admin'.
The POST /reports endpoint is mounted separately in main.py (no /admin prefix)
so any authenticated user can file a report.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.dependencies import (
    get_admin_service,
    get_report_service,
    get_admin_rating_service,
    get_current_user_id,
)
from app.domain.services.admin_service import AdminService
from app.domain.services.report_service import ReportService
from app.domain.services.admin_rating_service import AdminRatingService
from app.api.schemas.admin_schema import AdminUserPatch, ReportCreate, ReportPatch
from app.api.schemas.rating_schema import AdminRatingCreate, AdminRatingUpdate
from app.shared.roles import require_role
from app.shared.logger import log

# ---------------------------------------------------------------------------
# Admin-only router  (prefix /admin added in main.py)
# ---------------------------------------------------------------------------
router = APIRouter(tags=["Admin"])

# Reusable dependency for admin guard
_admin = Depends(require_role("admin"))


# ============================================================
# Users
# ============================================================

@router.get("/users", summary="List all users (paginated)")
def list_users(
    limit: int = Query(20, ge=1, le=100),
    start_after_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search by name, email, or UID"),
    role_filter: Optional[str] = Query(None, alias="role"),
    admin_data: dict = _admin,
    service: AdminService = Depends(get_admin_service),
):
    log.info(f"admin.list_users by={admin_data['uid']} search={search} role={role_filter}")
    return service.list_users(
        limit=limit,
        start_after_id=start_after_id,
        search=search,
        role_filter=role_filter,
    )


@router.get("/users/{uid}", summary="Get user detail")
def get_user(
    uid: str,
    admin_data: dict = _admin,
    service: AdminService = Depends(get_admin_service),
):
    user = service.get_user(uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/users/{uid}", summary="Update user (role change / disable / soft delete)")
def patch_user(
    uid: str,
    datos: AdminUserPatch,
    admin_data: dict = _admin,
    service: AdminService = Depends(get_admin_service),
):
    updated = service.patch_user(uid, datos.dict(exclude_none=True), admin_uid=admin_data["uid"])
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    log.info(f"admin.patch_user uid={uid} by={admin_data['uid']}")
    return updated


# ============================================================
# Chats
# ============================================================

@router.get("/chats", summary="List all conversations (paginated)")
def list_chats(
    limit: int = Query(20, ge=1, le=100),
    start_after_id: Optional[str] = Query(None),
    search_uid: Optional[str] = Query(None, description="Filter chats by participant UID"),
    admin_data: dict = _admin,
    service: AdminService = Depends(get_admin_service),
):
    log.info(f"admin.list_chats by={admin_data['uid']} search_uid={search_uid}")
    return service.list_chats(
        limit=limit,
        start_after_id=start_after_id,
        search_uid=search_uid,
    )


@router.get("/chats/{chat_id}", summary="Get chat with messages")
def get_chat(
    chat_id: str,
    admin_data: dict = _admin,
    service: AdminService = Depends(get_admin_service),
):
    chat = service.get_chat_with_messages(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    return chat


# ============================================================
# Reports  (admin-only read/update side)
# ============================================================

@router.get("/reports", summary="List reports (filterable by status)")
def list_reports(
    status: Optional[str] = Query(None, description="pending | resolved"),
    limit: int = Query(20, ge=1, le=100),
    start_after_id: Optional[str] = Query(None),
    admin_data: dict = _admin,
    service: ReportService = Depends(get_report_service),
):
    log.info(f"admin.list_reports by={admin_data['uid']} status={status}")
    return service.list_reports(
        status_filter=status,
        limit=limit,
        start_after_id=start_after_id,
    )


@router.patch("/reports/{report_id}", summary="Update report status / add resolution notes")
def patch_report(
    report_id: str,
    datos: ReportPatch,
    admin_data: dict = _admin,
    service: ReportService = Depends(get_report_service),
):
    updated = service.resolve_report(
        report_id=report_id,
        datos=datos.dict(exclude_none=True),
        admin_uid=admin_data["uid"],
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return updated


# ============================================================
# Ratings (Admin CRUD)
# ============================================================

@router.get("/calificaciones", summary="List ratings (admin)")
def list_ratings(
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="active | deleted"),
    start_after_id: Optional[str] = Query(None),
    admin_data: dict = _admin,
    service: AdminRatingService = Depends(get_admin_rating_service),
):
    log.info(f"admin.list_ratings by={admin_data['uid']} status={status}")
    return service.list_ratings_admin(limit, status, start_after_id)

@router.post("/calificaciones", status_code=201, summary="Admin Create Rating")
def create_rating_admin(
    datos: AdminRatingCreate,
    admin_data: dict = _admin,
    service: AdminRatingService = Depends(get_admin_rating_service),
):
    log.info(f"admin.create_rating by={admin_data['uid']}")
    return service.create_rating_admin(
        calificador_id=datos.calificador_id,
        calificado_id=datos.calificado_id,
        calificacion=datos.calificacion,
        observacion=datos.observacion,
        admin_id=admin_data["uid"],
        solicitud_id=datos.solicitud_id
    )

@router.patch("/calificaciones/{rating_id}", summary="Admin Update Rating")
def update_rating_admin(
    rating_id: str,
    datos: AdminRatingUpdate,
    admin_data: dict = _admin,
    service: AdminRatingService = Depends(get_admin_rating_service),
):
    log.info(f"admin.update_rating rating_id={rating_id} by={admin_data['uid']}")
    return service.update_rating_admin(rating_id, datos.dict(exclude_unset=True), admin_data["uid"])

@router.delete("/calificaciones/{rating_id}", summary="Admin Soft Delete Rating")
def soft_delete_rating_admin(
    rating_id: str,
    admin_data: dict = _admin,
    service: AdminRatingService = Depends(get_admin_rating_service),
):
    log.info(f"admin.soft_delete_rating rating_id={rating_id} by={admin_data['uid']}")
    return service.delete_rating_admin(rating_id, admin_data["uid"])


# ============================================================
# User-facing reports router  (mounted at /reports in main.py)
# ============================================================
reports_router = APIRouter(tags=["Reports"])


@reports_router.post("/reports", status_code=201, summary="File a report (any authenticated user)")
async def create_report(
    datos: ReportCreate,
    user_id: str = Depends(get_current_user_id),
    service: ReportService = Depends(get_report_service),
):
    report_id = service.create_report(datos.dict(), reporter_uid=user_id)
    return {"id": report_id, "message": "Reporte enviado correctamente"}
