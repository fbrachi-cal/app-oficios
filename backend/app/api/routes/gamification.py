"""
Gamification API routes.

Endpoints:
  GET  /gamification/me                      → current profile + level + progress + pending event
  POST /gamification/events/{event_id}/seen  → mark a level-up event as seen
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.adapters.firebase.firebase_gamification_repo import FirebaseGamificationRepository
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.domain.services.gamification_service import GamificationService
from app.shared.firebase_auth import verify_token
from app.shared.logger import log

router = APIRouter()

# ---------------------------------------------------------------------------
# Dependency factories
# ---------------------------------------------------------------------------

def _get_gamification_service() -> GamificationService:
    return GamificationService(gamification_repo=FirebaseGamificationRepository())


def _get_user_repo() -> FirebaseUserRepository:
    return FirebaseUserRepository()


def _program_id_for_tipo(tipo: str) -> str:
    """Map user tipo to its canonical gamification program ID."""
    mapping = {
        "profesional": "professional_reputation",
        "cliente": "client_reputation",
    }
    program_id = mapping.get(tipo)
    if not program_id:
        raise HTTPException(
            status_code=400,
            detail=f"No gamification program defined for user tipo='{tipo}'"
        )
    return program_id


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/me", summary="Get my gamification profile")
def get_my_gamification(
    user_data: dict = Depends(verify_token),
    service: GamificationService = Depends(_get_gamification_service),
    user_repo: FirebaseUserRepository = Depends(_get_user_repo),
):
    uid = user_data["uid"]
    user = user_repo.get_user_by_id(uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tipo = user.get("tipo")
    program_id = _program_id_for_tipo(tipo)

    log.info(f"GET /gamification/me uid={uid} program={program_id}")

    # Re-evaluate so the response always reflects current state
    try:
        service.evaluate_user(user, program_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return service.get_me(user, program_id)


@router.post("/events/{event_id}/seen", summary="Mark a gamification event as seen")
def mark_event_seen(
    event_id: str,
    user_data: dict = Depends(verify_token),
    service: GamificationService = Depends(_get_gamification_service),
):
    uid = user_data["uid"]
    repo: FirebaseGamificationRepository = service.repo  # type: ignore[assignment]

    event = repo.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")

    if event.get("seen"):
        return {"detail": "Event already marked as seen"}

    seen_at = datetime.now(timezone.utc).isoformat()
    repo.mark_event_seen(event_id, seen_at)
    log.info(f"Event {event_id} marked seen by uid={uid}")
    return {"detail": "Event marked as seen", "seen_at": seen_at}
