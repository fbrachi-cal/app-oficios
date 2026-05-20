from abc import ABC, abstractmethod
from typing import List, Dict, Optional

class ProfessionalReferralsRepository(ABC):
    @abstractmethod
    def create_referral(self, referral_data: dict) -> dict:
        pass
        
    @abstractmethod
    def get_referral_by_client_and_contact(self, client_id: str, normalized_phone: Optional[str], normalized_email: Optional[str]) -> Optional[dict]:
        pass
        
    @abstractmethod
    def get_pending_referrals_by_contact(self, normalized_phone: Optional[str], normalized_email: Optional[str]) -> List[dict]:
        pass
        
    @abstractmethod
    def update_referral(self, referral_id: str, updates: dict) -> None:
        pass

    @abstractmethod
    def get_linked_referrals_for_client(self, client_id: str) -> List[dict]:
        pass
