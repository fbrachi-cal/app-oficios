import pytest
from unittest.mock import MagicMock
from app.domain.services.professional_referrals_service import ProfessionalReferralsService, normalize_phone, normalize_email
from app.ports.professional_referrals_repository import ProfessionalReferralsRepository
from app.ports.user_repository import UserRepository
from typing import List, Dict, Optional

class InMemoryReferralsRepo(ProfessionalReferralsRepository):
    def __init__(self):
        self.referrals = []
        self.counter = 0

    def create_referral(self, referral_data: dict) -> dict:
        self.counter += 1
        referral_data["id"] = f"ref_{self.counter}"
        self.referrals.append(referral_data)
        return referral_data

    def get_referral_by_client_and_contact(self, client_id: str, normalized_phone: Optional[str], normalized_email: Optional[str]) -> Optional[dict]:
        for r in self.referrals:
            if r["client_id"] == client_id:
                if normalized_phone and r.get("normalized_phone") == normalized_phone:
                    return r
                if normalized_email and r.get("normalized_email") == normalized_email:
                    return r
        return None

    def get_pending_referrals_by_contact(self, normalized_phone: Optional[str], normalized_email: Optional[str]) -> List[dict]:
        results = []
        for r in self.referrals:
            if r.get("status") in ["pending_invitation", "invited"] and r.get("professional_user_id") is None:
                if (normalized_phone and r.get("normalized_phone") == normalized_phone) or \
                   (normalized_email and r.get("normalized_email") == normalized_email):
                    results.append(r)
        return results

    def update_referral(self, referral_id: str, updates: dict) -> None:
        for r in self.referrals:
            if r["id"] == referral_id:
                r.update(updates)

    def get_linked_referrals_for_client(self, client_id: str) -> List[dict]:
        return [r for r in self.referrals if r["client_id"] == client_id and r.get("status") in ["registered", "active_professional"]]

class InMemoryUserRepo(UserRepository):
    def __init__(self):
        self.users = {}

    def get_user_by_id(self, user_id: str) -> dict:
        return self.users.get(user_id)

    def get_users_by_ids(self, user_ids: List[str]) -> List[Dict]:
        return [self.users[uid] for uid in user_ids if uid in self.users]

    def save_user(self, user_data: dict):
        pass

    def get_all_users(self):
        pass

    def buscar_profesionales(self, zonas, categoria, subcategorias, limit, start_after_id):
        pass

    def actualizar_campos_usuario(self, user_id: str, campos: dict):
        pass

@pytest.fixture
def service_setup():
    referrals_repo = InMemoryReferralsRepo()
    user_repo = InMemoryUserRepo()
    gamification_service = MagicMock()
    service = ProfessionalReferralsService(referrals_repo, user_repo, gamification_service)
    return service, referrals_repo, user_repo, gamification_service

def test_create_referral_requires_phone_or_email(service_setup):
    service, _, _, _ = service_setup
    with pytest.raises(ValueError, match="Debe proveer un teléfono o un correo electrónico"):
        service.create_referral("client_1", {"professional_name": "Juan"})

def test_create_referral_requires_name(service_setup):
    service, _, _, _ = service_setup
    with pytest.raises(ValueError, match="El nombre del profesional es obligatorio"):
        service.create_referral("client_1", {"professional_email": "juan@example.com"})

def test_create_referral_success(service_setup):
    service, repo, _, _ = service_setup
    result = service.create_referral("client_1", {
        "professional_name": "Juan",
        "professional_phone": "123-456-7890",
        "professional_email": " JUAN@example.com "
    })
    assert result["id"] == "ref_1"
    assert result["status"] == "pending_invitation"
    assert result["normalized_phone"] == "1234567890"
    assert result["normalized_email"] == "juan@example.com"
    assert result["professional_user_id"] is None
    assert len(repo.referrals) == 1

def test_create_duplicate_referral_rejected(service_setup):
    service, _, _, _ = service_setup
    service.create_referral("client_1", {"professional_name": "Juan", "professional_email": "juan@test.com"})
    
    with pytest.raises(ValueError, match="Ya has recomendado a un profesional con este teléfono o correo"):
        service.create_referral("client_1", {"professional_name": "Juancho", "professional_email": "JUAN@test.com"})

def test_linking_matches_pending_referrals(service_setup):
    service, repo, user_repo, gamification = service_setup
    user_repo.users["client_1"] = {"id": "client_1", "tipo": "cliente"}
    
    service.create_referral("client_1", {"professional_name": "Juan", "professional_email": "juan@test.com"})
    service.create_referral("client_2", {"professional_name": "Juancho", "professional_phone": "112233"})
    
    # Registering professional matches email
    linked = service.link_professional("prof_1", email="Juan@test.com")
    assert linked == 1
    
    ref1 = repo.referrals[0]
    assert ref1["status"] == "registered"
    assert ref1["professional_user_id"] == "prof_1"
    
    # Gamification should be triggered for client_1
    gamification.evaluate_user.assert_called_once_with({"id": "client_1", "tipo": "cliente"}, "client_reputation")

def test_linking_does_not_match_already_linked(service_setup):
    service, repo, user_repo, _ = service_setup
    user_repo.users["client_1"] = {"id": "client_1"}
    service.create_referral("client_1", {"professional_name": "Juan", "professional_email": "juan@test.com"})
    
    service.link_professional("prof_1", email="juan@test.com")
    assert repo.referrals[0]["status"] == "registered"
    
    # Another prof with same email registers?
    linked2 = service.link_professional("prof_2", email="juan@test.com")
    assert linked2 == 0 # because it's no longer pending

def test_client_metrics_use_linked_referrals(service_setup):
    # This tests _resolve_client_metrics logic
    from app.domain.services.gamification_service import _resolve_client_metrics
    service, repo, user_repo, _ = service_setup
    
    user_repo.users["client_1"] = {"id": "client_1"}
    user_repo.users["prof_1"] = {"id": "prof_1", "promedioCalificacion": 4.5, "cantidadCalificaciones": 2}
    user_repo.users["prof_2"] = {"id": "prof_2", "promedioCalificacion": 3.5, "cantidadCalificaciones": 1}
    user_repo.users["prof_3"] = {"id": "prof_3", "promedioCalificacion": 0.0, "cantidadCalificaciones": 0}
    
    # Create and link referrals
    service.create_referral("client_1", {"professional_name": "A", "professional_email": "a@a.com"})
    service.create_referral("client_1", {"professional_name": "B", "professional_email": "b@b.com"})
    service.create_referral("client_1", {"professional_name": "C", "professional_email": "c@c.com"})
    
    service.link_professional("prof_1", email="a@a.com")
    service.link_professional("prof_2", email="b@b.com")
    # C remains pending
    
    metrics = _resolve_client_metrics({"id": "client_1"}, user_repo=user_repo, referrals_repo=repo)
    
    assert metrics["recommended_professionals_count"] == 2
    assert metrics["recommended_professionals_avg_rating"] == 4.0 # (4.5 + 3.5) / 2
