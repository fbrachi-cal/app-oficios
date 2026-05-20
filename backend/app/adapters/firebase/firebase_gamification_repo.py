"""
Firestore adapter for the gamification repository port.

Collections used:
  - gamification_programs/{program_id}
  - gamification_levels/{level_id}     (field: program_id, level_order)
  - user_gamification_profiles/{user_id}_{program_id}
  - gamification_events/{event_id}
"""
from typing import List, Optional
from app.ports.gamification_repository import GamificationRepository
from app.adapters.firebase.firebase_config import get_firestore
from app.shared.logger import log


class FirebaseGamificationRepository(GamificationRepository):

    def __init__(self):
        self.db = get_firestore()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _profile_doc_id(self, user_id: str, program_id: str) -> str:
        return f"{user_id}_{program_id}"

    # ------------------------------------------------------------------
    # Programs
    # ------------------------------------------------------------------

    def get_program(self, program_id: str) -> Optional[dict]:
        doc = self.db.collection("gamification_programs").document(program_id).get()
        if not doc.exists:
            log.warning(f"Gamification program not found: {program_id}")
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    # ------------------------------------------------------------------
    # Levels
    # ------------------------------------------------------------------

    def get_levels_for_program(self, program_id: str) -> List[dict]:
        """Return levels sorted by level_order ascending (in-memory sort for portability)."""
        query = (
            self.db.collection("gamification_levels")
            .where("program_id", "==", program_id)
        )
        docs = list(query.stream())
        levels = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            levels.append(data)
        levels.sort(key=lambda lvl: lvl.get("level_order", 0))
        log.info(f"Loaded {len(levels)} levels for program {program_id}")
        return levels

    # ------------------------------------------------------------------
    # User profiles
    # ------------------------------------------------------------------

    def get_profile(self, user_id: str, program_id: str) -> Optional[dict]:
        doc_id = self._profile_doc_id(user_id, program_id)
        doc = self.db.collection("user_gamification_profiles").document(doc_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def save_profile(self, profile: dict) -> None:
        user_id = profile["user_id"]
        program_id = profile["program_id"]
        doc_id = self._profile_doc_id(user_id, program_id)
        self.db.collection("user_gamification_profiles").document(doc_id).set(profile)
        log.info(f"Saved gamification profile for user={user_id} program={program_id}")

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def create_event(self, event: dict) -> str:
        doc_ref = self.db.collection("gamification_events").document()
        event["id"] = doc_ref.id
        doc_ref.set(event)
        log.info(
            f"Created gamification event id={doc_ref.id} type={event.get('event_type')} "
            f"user={event.get('user_id')}"
        )
        return doc_ref.id

    def get_pending_events(self, user_id: str, program_id: str) -> List[dict]:
        query = (
            self.db.collection("gamification_events")
            .where("user_id", "==", user_id)
            .where("program_id", "==", program_id)
            .where("seen", "==", False)
        )
        results = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return results

    def mark_event_seen(self, event_id: str, seen_at: str) -> None:
        self.db.collection("gamification_events").document(event_id).update({
            "seen": True,
            "seen_at": seen_at,
        })
        log.info(f"Gamification event {event_id} marked as seen")

    def get_event(self, event_id: str) -> Optional[dict]:
        doc = self.db.collection("gamification_events").document(event_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data
