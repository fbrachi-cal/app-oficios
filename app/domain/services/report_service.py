"""
Report domain service.
Handles creation and management of user/message reports.
All resolution actions record audit metadata (resolved_by, resolved_at).
"""
from datetime import datetime
from typing import Optional, Dict, List
from app.ports.report_repository import ReportRepository
from app.shared.logger import log


class ReportService:
    def __init__(self, report_repository: ReportRepository):
        self.report_repository = report_repository

    def create_report(self, data: dict, reporter_uid: str) -> str:
        """
        Creates a new report filed by an authenticated user.
        Sets status=pending and stamps created_at.
        """
        payload = {
            "reporter_uid": reporter_uid,
            "target_type": data["target_type"],
            "target_id": data["target_id"],
            "reason": data["reason"],
            "status": "pending",
            "created_at": datetime.utcnow(),
            # Resolution fields start as None
            "resolved_by": None,
            "resolved_at": None,
            "resolution_notes": None,
        }
        report_id = self.report_repository.create_report(payload)
        log.info(f"report.create reporter={reporter_uid} target={data['target_id']} id={report_id}")
        return report_id

    def list_reports(
        self,
        status_filter: Optional[str] = None,
        limit: int = 20,
        start_after_id: Optional[str] = None,
    ) -> Dict:
        """Returns paginated reports, optionally filtered by status."""
        items = self.report_repository.get_all_reports(
            status_filter=status_filter,
            limit=limit,
            start_after_id=start_after_id,
        )
        next_cursor = items[-1]["id"] if len(items) == limit else None
        return {
            "items": items,
            "total": len(items),
            "limit": limit,
            "next_cursor": next_cursor,
        }

    def get_report(self, report_id: str) -> Optional[Dict]:
        return self.report_repository.get_report_by_id(report_id)

    def resolve_report(self, report_id: str, datos: dict, admin_uid: str) -> Optional[Dict]:
        """
        Patches a report.  If status is being set to 'resolved', stamps audit fields.
        """
        report = self.report_repository.get_report_by_id(report_id)
        if not report:
            return None

        campos: dict = {}
        if datos.get("status"):
            campos["status"] = datos["status"]
            if datos["status"] == "resolved":
                campos["resolved_by"] = admin_uid
                campos["resolved_at"] = datetime.utcnow()

        if datos.get("resolution_notes") is not None:
            campos["resolution_notes"] = datos["resolution_notes"]

        if campos:
            log.info(f"report.resolve id={report_id} by={admin_uid} campos={campos}")
            self.report_repository.update_report(report_id, campos)

        return self.report_repository.get_report_by_id(report_id)
