from typing import List, Optional
from datetime import datetime
from app.ports.rating_repository import RatingRepository
from firebase_admin import firestore
from app.shared.logger import log


def _resolve_total(udata: dict, old_count: int) -> float:
    """
    Invariant safety check: reconcile promedioCalificacion * cantidadCalificaciones
    against the stored totalScore.
    If the two values differ by more than 0.01, the stored avg*count is used to
    auto-heal the inconsistency (e.g. from a manual DB edit or prior bug).
    """
    if old_count > 0:
        expected_total = float(udata.get("promedioCalificacion", 0)) * old_count
        actual_total = float(udata.get("totalScore", expected_total))
        if abs(expected_total - actual_total) > 0.01:
            log.warning(
                f"Invariant mismatch: expected_total={expected_total:.4f} "
                f"actual_total={actual_total:.4f} — auto-healing with expected_total"
            )
            return expected_total
        return actual_total
    return 0.0


class FirebaseRatingRepository(RatingRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection("calificaciones")

    # ------------------------------------------------------------------
    # Non-admin reads — always filter deleted_at == null
    # ------------------------------------------------------------------

    def guardar_calificacion(self, data: dict) -> dict:
        doc_ref = self.collection.document()
        data["id"] = doc_ref.id
        now = datetime.utcnow().isoformat()
        data["fecha"] = now
        data["created_at"] = now
        doc_ref.set(data)
        return data

    def obtener_calificaciones_por_usuario(self, usuario_id: str) -> list:
        docs = self.collection.where("calificado_id", "==", usuario_id).stream()
        return [
            d.to_dict() for d in docs
            if d.to_dict().get("deleted_at") is None
        ]

    def obtener_calificacion_por_solicitud_y_usuario(
        self, solicitud_id: str, calificador_id: str
    ) -> Optional[dict]:
        query = (
            self.collection
            .where("solicitud_id", "==", solicitud_id)
            .where("calificador_id", "==", calificador_id)
            .stream()
        )
        for doc in query:
            data = doc.to_dict()
            if data.get("deleted_at") is None:
                return data
        return None

    # ------------------------------------------------------------------
    # Admin reads
    # ------------------------------------------------------------------

    def list_ratings_admin(
        self,
        limit: int = 20,
        status_filter: Optional[str] = None,
        start_after_id: Optional[str] = None,
    ) -> List[dict]:
        query = self.collection.order_by("fecha", direction=firestore.Query.DESCENDING)
        if start_after_id:
            last_doc = self.collection.document(start_after_id).get()
            if last_doc.exists:
                query = query.start_after(last_doc)

        results = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            is_deleted = data.get("deleted_at") is not None
            if status_filter == "active" and is_deleted:
                continue
            if status_filter == "deleted" and not is_deleted:
                continue
            results.append(data)
            if len(results) >= limit:
                break
        return results

    def get_rating_by_id(self, rating_id: str) -> Optional[dict]:
        doc = self.collection.document(rating_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    # ------------------------------------------------------------------
    # CREATE — fully transactional
    # Reads user stats inside the transaction, computes with full precision,
    # writes rating + updated stats atomically.
    # ------------------------------------------------------------------
    def create_rating_and_stats_transactional(
        self, rating_data: dict, calificado_id: str, score: int
    ) -> str:
        transaction = self.db.transaction()
        user_ref = self.db.collection("usuarios").document(calificado_id)
        rating_ref = self.collection.document()

        @firestore.transactional
        def _run(txn, user_ref, rating_ref, rating_data, score):
            # --- Read user stats inside the transaction ---
            snap = user_ref.get(transaction=txn)
            if snap.exists:
                udata = snap.to_dict()
                old_count = int(udata.get("cantidadCalificaciones", 0))
                old_total = _resolve_total(udata, old_count)
            else:
                old_count = 0
                old_total = 0.0

            new_count = old_count + 1
            new_total = old_total + float(score)
            # No rounding on persistance — full precision stored
            new_avg = new_total / new_count if new_count > 0 else 0.0

            rating_id = rating_ref.id
            now = datetime.utcnow().isoformat()
            final_data = dict(rating_data)
            final_data["id"] = rating_id
            final_data["fecha"] = now
            final_data["created_at"] = now

            txn.set(rating_ref, final_data)
            txn.update(user_ref, {
                "promedioCalificacion": new_avg,
                "cantidadCalificaciones": new_count,
                "totalScore": new_total,
            })
            return rating_id

        return _run(transaction, user_ref, rating_ref, rating_data, score)

    # ------------------------------------------------------------------
    # UPDATE / SOFT DELETE — fully transactional
    # Reads BOTH the rating doc AND user stats inside the transaction.
    # old_score_hint from the service is NOT used for arithmetic —
    # the persisted calificacion is re-read inside the transaction.
    # Idempotency for delete is enforced inside the transaction (race-safe).
    # ------------------------------------------------------------------
    def update_rating_and_stats_transactional(
        self,
        rating_id: str,
        rating_data: dict,
        calificado_id: Optional[str],
        old_score_hint: int,  # NOT used for arithmetic — authoritative value read inside txn
        new_score: Optional[int],
        is_delete: bool = False,
    ) -> None:
        transaction = self.db.transaction()
        rating_ref = self.collection.document(rating_id)
        user_ref = (
            self.db.collection("usuarios").document(calificado_id)
            if calificado_id else None
        )

        @firestore.transactional
        def _run(txn, rating_ref, user_ref, rating_data, new_score, is_delete):
            # --- Read rating doc (source of truth for old_score) ---
            rating_snap = rating_ref.get(transaction=txn)
            if not rating_snap.exists:
                raise Exception("Calificación no encontrada en la transacción")

            rating_doc = rating_snap.to_dict()
            persisted_old_score = int(rating_doc.get("calificacion", 0))

            # Idempotency guard inside the transaction (covers concurrent deletes)
            if is_delete and rating_doc.get("deleted_at") is not None:
                return

            # --- Read user stats and apply invariant check ---
            if user_ref:
                snap = user_ref.get(transaction=txn)
                if snap.exists:
                    udata = snap.to_dict()
                    old_count = int(udata.get("cantidadCalificaciones", 0))
                    old_total = _resolve_total(udata, old_count)
                else:
                    old_count = 0
                    old_total = 0.0

                if is_delete:
                    new_count = max(0, old_count - 1)
                    new_total = max(0.0, old_total - persisted_old_score)
                elif new_score is not None and new_score != persisted_old_score:
                    new_count = old_count  # edit does not change count
                    new_total = max(0.0, old_total - persisted_old_score + float(new_score))
                else:
                    # No score change — carry forward without recomputing
                    new_count = old_count
                    new_total = old_total

                # No rounding on persistence — full precision stored
                new_avg = new_total / new_count if new_count > 0 else 0.0

                txn.update(user_ref, {
                    "promedioCalificacion": new_avg,
                    "cantidadCalificaciones": new_count,
                    "totalScore": new_total,
                })

            txn.update(rating_ref, rating_data)

        _run(transaction, rating_ref, user_ref, rating_data, new_score, is_delete)
