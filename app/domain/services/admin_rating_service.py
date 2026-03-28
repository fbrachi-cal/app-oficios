from typing import Optional
from datetime import datetime
from app.ports.rating_repository import RatingRepository
from app.ports.user_repository import UserRepository
from app.shared.logger import log
from fastapi import HTTPException


class AdminRatingService:
    def __init__(self, rating_repo: RatingRepository, user_repo: UserRepository):
        self.repo = rating_repo
        self.user_repo = user_repo

    def list_ratings_admin(
        self,
        limit: int = 20,
        status_filter: Optional[str] = None,
        start_after_id: Optional[str] = None,
    ):
        return self.repo.list_ratings_admin(limit, status_filter, start_after_id)

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------
    def create_rating_admin(
        self,
        calificador_id: str,
        calificado_id: str,
        calificacion: int,
        observacion: str,
        admin_id: str,
        solicitud_id: Optional[str] = None,
    ):
        if not 1 <= calificacion <= 5:
            raise HTTPException(status_code=422, detail="La calificación debe ser entre 1 y 5")

        # Existence check only — stats are read inside the transaction
        user = self.user_repo.get_user_by_id(calificado_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario calificado no encontrado")

        rating_data: dict = {
            "calificador_id": calificador_id,
            "calificado_id": calificado_id,
            "calificacion": calificacion,
            "observacion": observacion,
            "created_by": admin_id,
        }
        if solicitud_id:
            rating_data["solicitud_id"] = solicitud_id

        rating_id = self.repo.create_rating_and_stats_transactional(
            rating_data, calificado_id, calificacion
        )
        log.info(
            f"AdminRatingCreate | rating_id={rating_id} | admin_id={admin_id} "
            f"| user_id={calificado_id} | score={calificacion}"
        )
        return {"id": rating_id, "message": "Calificación creada"}

    # ------------------------------------------------------------------
    # UPDATE
    # Pre-flight read is for fast validation only.
    # old_score is re-read authoritatively inside the transaction.
    # ------------------------------------------------------------------
    def update_rating_admin(self, rating_id: str, data: dict, admin_id: str):
        rating = self.repo.get_rating_by_id(rating_id)
        if not rating:
            raise HTTPException(status_code=404, detail="Calificación no encontrada")

        if rating.get("deleted_at") is not None:
            raise HTTPException(
                status_code=409, detail="No se puede editar una calificación eliminada"
            )

        new_score = data.get("calificacion")
        if new_score is not None and not 1 <= int(new_score) <= 5:
            raise HTTPException(status_code=422, detail="La calificación debe ser entre 1 y 5")

        calificado_id: str = rating.get("calificado_id", "")
        old_score_hint = int(rating.get("calificacion", 0))  # hint — NOT used for arithmetic in txn

        now = datetime.utcnow().isoformat()
        rating_update: dict = {
            "updated_at": now,
            "updated_by": admin_id,
        }
        if new_score is not None:
            rating_update["calificacion"] = int(new_score)
        if "observacion" in data and data["observacion"] is not None:
            rating_update["observacion"] = data["observacion"]

        self.repo.update_rating_and_stats_transactional(
            rating_id,
            rating_update,
            calificado_id,
            old_score_hint,
            int(new_score) if new_score is not None else None,
            is_delete=False,
        )
        log.info(
            f"AdminRatingUpdate | rating_id={rating_id} | admin_id={admin_id} "
            f"| user_id={calificado_id} | old_score_hint={old_score_hint} | new_score={new_score}"
        )
        return {"id": rating_id, "message": "Calificación actualizada"}

    # ------------------------------------------------------------------
    # SOFT DELETE — idempotent at two layers
    # Layer 1 (service): fast pre-flight check
    # Layer 2 (transaction): race-safe guard inside the txn
    # ------------------------------------------------------------------
    def delete_rating_admin(self, rating_id: str, admin_id: str):
        rating = self.repo.get_rating_by_id(rating_id)
        if not rating:
            log.info(
                f"AdminRatingDelete | rating_id={rating_id} | admin_id={admin_id} "
                f"| result=not_found"
            )
            return {"id": rating_id, "message": "No existe o ya fue eliminada"}

        if rating.get("deleted_at") is not None:
            log.info(
                f"AdminRatingDelete | rating_id={rating_id} | admin_id={admin_id} "
                f"| result=already_deleted (idempotent)"
            )
            return {"id": rating_id, "message": "Ya estaba eliminada"}

        old_score_hint = int(rating.get("calificacion", 0))
        calificado_id: str = rating.get("calificado_id", "")

        now = datetime.utcnow().isoformat()
        rating_update = {
            "deleted_at": now,
            "deleted_by": admin_id,
        }

        self.repo.update_rating_and_stats_transactional(
            rating_id,
            rating_update,
            calificado_id,
            old_score_hint,
            None,
            is_delete=True,
        )
        log.info(
            f"AdminRatingDelete | rating_id={rating_id} | admin_id={admin_id} "
            f"| user_id={calificado_id} | score_removed={old_score_hint}"
        )
        return {"id": rating_id, "message": "Calificación eliminada"}
