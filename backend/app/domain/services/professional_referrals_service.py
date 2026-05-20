import re
from datetime import datetime, timezone
from typing import Optional, List, Dict
from app.ports.professional_referrals_repository import ProfessionalReferralsRepository
from app.ports.user_repository import UserRepository
from app.domain.services.gamification_service import GamificationService
from app.shared.logger import log

def normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone: return None
    # Strip non-digits and keep only numeric characters
    cleaned = re.sub(r'\D', '', phone)
    return cleaned if cleaned else None

def normalize_email(email: Optional[str]) -> Optional[str]:
    if not email: return None
    return email.strip().lower()

class ProfessionalReferralsService:
    def __init__(
        self, 
        referrals_repo: ProfessionalReferralsRepository, 
        user_repo: UserRepository,
        gamification_service: GamificationService
    ):
        self.repo = referrals_repo
        self.user_repo = user_repo
        self.gamification_service = gamification_service

    def create_referral(self, client_id: str, referral_data: dict) -> dict:
        """
        Creates a new referral. Validates that the professional has either email or phone.
        Normalizes email and phone. Prevents duplicate contact per client.
        """
        prof_name = referral_data.get("professional_name")
        prof_phone = referral_data.get("professional_phone")
        prof_email = referral_data.get("professional_email")

        if not prof_name:
            raise ValueError("El nombre del profesional es obligatorio.")

        if not prof_phone and not prof_email:
            raise ValueError("Debe proveer un teléfono o un correo electrónico del profesional.")

        norm_phone = normalize_phone(prof_phone)
        norm_email = normalize_email(prof_email)

        if not norm_phone and not norm_email:
            raise ValueError("El teléfono o el correo electrónico proporcionado no es válido.")

        # Check for duplicates by this client
        existing = self.repo.get_referral_by_client_and_contact(client_id, norm_phone, norm_email)
        if existing:
            raise ValueError("Ya has recomendado a un profesional con este teléfono o correo electrónico.")

        now = datetime.now(timezone.utc).isoformat()
        
        new_referral = {
            "client_id": client_id,
            "professional_user_id": None,
            "professional_name": prof_name,
            "professional_phone": prof_phone,
            "professional_email": prof_email,
            "normalized_phone": norm_phone,
            "normalized_email": norm_email,
            "category": referral_data.get("category"),
            "subcategory": referral_data.get("subcategory"),
            "zone": referral_data.get("zone"),
            "comment": referral_data.get("comment"),
            "worked_with_before": referral_data.get("worked_with_before"),
            "status": "pending_invitation",
            "created_at": now,
            "updated_at": now,
            "invited_at": None,
            "linked_at": None,
            "registered_at": None,
            "activated_at": None
        }

        created = self.repo.create_referral(new_referral)
        log.info(f"Creada recomendación de profesional {created['id']} por el cliente {client_id}")
        return created

    def link_professional(self, professional_user_id: str, phone: Optional[str] = None, email: Optional[str] = None) -> int:
        """
        Called when a professional registers or updates profile.
        Matches email/phone against pending referrals.
        Links them and triggers gamification evaluation for the clients who referred them.
        Returns the number of referrals linked.
        """
        norm_phone = normalize_phone(phone)
        norm_email = normalize_email(email)

        if not norm_phone and not norm_email:
            return 0

        pending = self.repo.get_pending_referrals_by_contact(norm_phone, norm_email)
        
        if not pending:
            return 0

        now = datetime.now(timezone.utc).isoformat()
        linked_count = 0

        for referral in pending:
            updates = {
                "professional_user_id": professional_user_id,
                "status": "registered",
                "linked_at": now,
                "registered_at": now,
                "updated_at": now
            }
            self.repo.update_referral(referral["id"], updates)
            linked_count += 1
            log.info(f"Referral {referral['id']} vinculada exitosamente al profesional {professional_user_id}")

            # Re-evaluate the referring client's gamification
            client_id = referral.get("client_id")
            if client_id:
                client_data = self.user_repo.get_user_by_id(client_id)
                if client_data:
                    try:
                        self.gamification_service.evaluate_user(client_data, "client_reputation")
                        log.info(f"Gamification re-evaluada para el cliente {client_id} por la recomendación.")
                    except Exception as e:
                        log.error(f"Error al re-evaluar gamificación para el cliente {client_id}: {e}")

        return linked_count
