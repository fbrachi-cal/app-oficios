# app/adapters/firebase/firebase_report_repo.py
from typing import List, Dict, Optional
from datetime import datetime
from app.ports.report_repository import ReportRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log


class FirebaseReportRepository(ReportRepository):
    """Firestore-backed implementation of ReportRepository.
    Collection: 'reports'
    Documents are sorted by created_at descending for admin listing.
    """

    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("reports")

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def create_report(self, data: dict) -> str:
        doc_ref = self.collection.document()
        data["created_at"] = datetime.utcnow()
        data["status"] = data.get("status", "pending")
        doc_ref.set(data)
        log.info(f"Report created: {doc_ref.id}")
        return doc_ref.id

    def update_report(self, report_id: str, campos: dict) -> None:
        self.collection.document(report_id).update(campos)
        log.info(f"Report updated: {report_id} → {campos}")

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_report_by_id(self, report_id: str) -> Optional[Dict]:
        doc = self.collection.document(report_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def get_all_reports(
        self,
        status_filter: Optional[str] = None,
        limit: int = 20,
        start_after_id: Optional[str] = None,
    ) -> List[Dict]:
        query = self.collection.order_by("created_at", direction="DESCENDING")

        if status_filter:
            query = query.where("status", "==", status_filter)

        if start_after_id:
            last_doc = self.collection.document(start_after_id).get()
            if last_doc.exists:
                query = query.start_after(last_doc)

        query = query.limit(limit)
        docs = list(query.stream())

        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)

        return results
