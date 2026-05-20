from typing import Dict, List, Optional
from google.cloud.firestore_v1.base_query import FieldFilter, Or
from app.ports.professional_referrals_repository import ProfessionalReferralsRepository
from app.adapters.firebase.firebase_config import get_firestore

class FirebaseProfessionalReferralsRepository(ProfessionalReferralsRepository):
    def __init__(self):
        self.db = get_firestore()
        self.collection = self.db.collection("professional_referrals")

    def create_referral(self, referral_data: dict) -> dict:
        doc_ref = self.collection.document()
        referral_data["id"] = doc_ref.id
        doc_ref.set(referral_data)
        return referral_data

    def get_referral_by_client_and_contact(self, client_id: str, normalized_phone: Optional[str], normalized_email: Optional[str]) -> Optional[dict]:
        query = self.collection.where(filter=FieldFilter("client_id", "==", client_id))
        
        # In Firestore, we cannot easily do dynamic ORs with multiple optional conditions combined with AND.
        # So we query by client_id and filter in memory since a client won't have thousands of referrals.
        docs = query.stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            if normalized_phone and data.get("normalized_phone") == normalized_phone:
                return data
            if normalized_email and data.get("normalized_email") == normalized_email:
                return data
                
        return None

    def get_pending_referrals_by_contact(self, normalized_phone: Optional[str], normalized_email: Optional[str]) -> List[dict]:
        if not normalized_phone and not normalized_email:
            return []

        # We want status in ['pending_invitation', 'invited']
        status_filter = FieldFilter("status", "in", ["pending_invitation", "invited"])
        
        # Querying by status first, then filtering in memory is more flexible and 
        # doesn't require composite indexes for every combination of email/phone.
        docs = self.collection.where(filter=status_filter).stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            
            # Must also not have professional_user_id
            if data.get("professional_user_id") is not None:
                continue
                
            match_phone = normalized_phone and data.get("normalized_phone") == normalized_phone
            match_email = normalized_email and data.get("normalized_email") == normalized_email
            
            if match_phone or match_email:
                results.append(data)
                
        return results

    def update_referral(self, referral_id: str, updates: dict) -> None:
        self.collection.document(referral_id).update(updates)

    def get_linked_referrals_for_client(self, client_id: str) -> List[dict]:
        # Linked means status is 'registered' or 'active_professional'
        status_filter = FieldFilter("status", "in", ["registered", "active_professional"])
        client_filter = FieldFilter("client_id", "==", client_id)
        
        # We fetch by client_id and filter status in memory to avoid composite index requirement
        docs = self.collection.where(filter=client_filter).stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            if data.get("status") in ["registered", "active_professional"]:
                data["id"] = doc.id
                results.append(data)
                
        return results
