from typing import List, Optional
from app.domain.cv.models import CV
from app.domain.cv.ports import CvRepositoryPort
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log

class FirebaseCvRepository(CvRepositoryPort):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("cvs")

    def save_cv(self, cv: CV) -> CV:
        cv_dict = cv.model_dump()
        # Convert datetime to string or let firestore handle datetime (Firestore handles python datetime correctly if timezone aware or naive UTC)
        self.collection.document(cv.id).set(cv_dict)
        return cv

    def get_cv(self, cv_id: str) -> Optional[CV]:
        doc = self.collection.document(cv_id).get()
        if doc.exists:
            data = doc.to_dict()
            return CV(**data)
        return None

    def update_cv(self, cv_id: str, data: dict) -> Optional[CV]:
        doc_ref = self.collection.document(cv_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
            
        doc_ref.update(data)
        
        # Read back to return updated model
        updated_doc = doc_ref.get()
        return CV(**updated_doc.to_dict())

    def list_cvs(self, filters: dict = None) -> List[CV]:
        query = self.collection

        if filters:
            if filters.get("status"):
                query = query.where("status", "==", filters["status"])
            if filters.get("seniority"):
                query = query.where("seniority", "==", filters["seniority"])
            if filters.get("salary_expectation"):
                query = query.where("salary_expectation", "==", filters["salary_expectation"])
            if filters.get("casa_rayuela_interview_result"):
                query = query.where("casa_rayuela_interview_result", "==", filters["casa_rayuela_interview_result"])
            if filters.get("residence_zone"):
                query = query.where("residence_zone", "==", filters["residence_zone"])
            if filters.get("tags"):
                # Firestore only supports one array_contains per query
                # For multiple tags, we'd need array_contains_any if supported
                if isinstance(filters["tags"], list) and len(filters["tags"]) > 0:
                    query = query.where("tags", "array_contains_any", filters["tags"])

        # Simple client-side text filtering for MVP search_text
        search_query = filters.get("search_text", "").lower() if filters else ""

        results = []
        for doc in query.stream():
            data = doc.to_dict()
            if search_query:
                # Basic case-insensitive text search over 'search_text' field
                if search_query not in data.get("search_text", "").lower():
                    continue
            results.append(CV(**data))
            
        return results

    def delete_cv(self, cv_id: str) -> bool:
        doc = self.collection.document(cv_id).get()
        if doc.exists:
            self.collection.document(cv_id).delete()
            return True
        return False
