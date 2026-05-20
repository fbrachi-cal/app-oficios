"""
Gamification domain service.

Responsibilities:
  - Resolve per-user metrics (metric adapters).
  - Evaluate level rules (rule engine).
  - Determine the highest achieved level.
  - Persist the profile and emit level-up events when the level changes.

Metric adapters — gap notes:
  - completed_jobs_count: uses cantidadCalificaciones as a temporary proxy.
    This will overcount if multiple ratings exist per job, and may undercount
    if a job was completed but never rated. Replace with a proper
    completed-status query once a job-completion lifecycle exists.
  - phone_verified: reads user.phone_verified (bool). Returns False until the
    registration / profile-update flow writes this field.
  - recommended_professionals_count: returns 0. No recommendation collection
    exists yet. Wire to a future RecommendationRepository.
  - recommended_professionals_avg_rating: returns 0.0 for the same reason.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.ports.gamification_repository import GamificationRepository
from app.shared.logger import log


# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------

_OPERATORS = {
    ">=": lambda a, b: a >= b,
    ">":  lambda a, b: a > b,
    "<=": lambda a, b: a <= b,
    "<":  lambda a, b: a < b,
    "==": lambda a, b: a == b,
}


def evaluate_rules(rules: List[dict], metrics: Dict[str, Any], mode: str = "all") -> bool:
    """
    Evaluate a list of rule objects against a metrics snapshot.

    Each rule: {"metric": str, "operator": str, "value": Any}
    mode "all" → every rule must pass (AND logic).

    Empty rules list → always True (entry level behaviour).
    """
    if not rules:
        return True

    results = []
    for rule in rules:
        metric = rule.get("metric")
        operator = rule.get("operator")
        threshold = rule.get("value")

        actual = metrics.get(metric)
        if actual is None:
            log.warning(f"Rule engine: metric '{metric}' not found in snapshot — treating as 0")
            actual = 0

        op_fn = _OPERATORS.get(operator)
        if op_fn is None:
            log.error(f"Rule engine: unknown operator '{operator}' — rule skipped")
            results.append(False)
            continue

        passed = op_fn(actual, threshold)
        log.info(f"  Rule: {metric} ({actual}) {operator} {threshold} → {passed}")
        results.append(passed)

    return all(results) if mode == "all" else any(results)


# ---------------------------------------------------------------------------
# Metric adapters
# ---------------------------------------------------------------------------

def _resolve_professional_metrics(user: dict, user_repo=None, referrals_repo=None) -> Dict[str, Any]:
    """
    Build the metrics snapshot for a professional user.

    completed_jobs_count proxy:
        Uses cantidadCalificaciones (number of ratings received).
        Limitation: a job may be rated 0 or multiple times.
        Replace this adapter once a formal job-completion status exists.
    """
    profile_fields = ["nombre", "foto", "descripcion", "subcategorias", "zonas"]
    profile_completed = all(bool(user.get(f)) for f in profile_fields)

    return {
        "completed_jobs_count": int(user.get("cantidadCalificaciones", 0)),
        "average_rating": float(user.get("promedioCalificacion", 0.0)),
        "profile_completed": bool(profile_completed),
        # phone_verified: field not yet written by registration flow.
        # Returns False until phone verification feature is shipped.
        "phone_verified": bool(user.get("phone_verified", False)),
    }


def _resolve_client_metrics(user: dict, user_repo=None, referrals_repo=None) -> Dict[str, Any]:
    """
    Build the metrics snapshot for a client user.

    recommended_professionals_count / recommended_professionals_avg_rating:
        Counts linked/registered/active referrals for the client.
        Computes the average rating of those linked professionals.
    """
    count = 0
    total_rating = 0.0

    if referrals_repo and user_repo:
        user_id = user.get("id")
        if user_id:
            referrals = referrals_repo.get_linked_referrals_for_client(user_id)
            count = len(referrals)
            
            # Fetch professional users to calculate average rating
            prof_ids = [r.get("professional_user_id") for r in referrals if r.get("professional_user_id")]
            if prof_ids:
                profs = user_repo.get_users_by_ids(prof_ids)
                ratings = []
                for p in profs:
                    # Only include ratings from professionals who actually have ratings
                    if float(p.get("cantidadCalificaciones", 0.0)) > 0:
                        ratings.append(float(p.get("promedioCalificacion", 0.0)))
                if ratings:
                    total_rating = sum(ratings) / len(ratings)

    return {
        "recommended_professionals_count": count,
        "recommended_professionals_avg_rating": total_rating,
    }


def _resolve_metrics(user: dict, program_id: str, user_repo=None, referrals_repo=None) -> Dict[str, Any]:
    if program_id == "professional_reputation":
        return _resolve_professional_metrics(user, user_repo, referrals_repo)
    if program_id == "client_reputation":
        return _resolve_client_metrics(user, user_repo, referrals_repo)
    log.warning(f"No metric adapter for program_id='{program_id}' — returning empty metrics")
    return {}


# ---------------------------------------------------------------------------
# Level selection
# ---------------------------------------------------------------------------

def _find_achieved_level(levels: List[dict], metrics: Dict[str, Any]) -> Optional[dict]:
    """
    Return the highest-order level whose rules are fully satisfied.

    Levels must be pre-sorted by level_order ascending.
    We iterate all and keep the last one that passes so the user gets the
    highest tier they qualify for.
    """
    achieved: Optional[dict] = None
    for level in levels:
        rules = level.get("rules", [])
        mode = level.get("rules_mode", "all")
        if evaluate_rules(rules, metrics, mode):
            achieved = level
    return achieved


# ---------------------------------------------------------------------------
# GamificationService
# ---------------------------------------------------------------------------

class GamificationService:
    def __init__(self, gamification_repo: GamificationRepository, user_repo=None, referrals_repo=None):
        self.repo = gamification_repo
        self.user_repo = user_repo
        self.referrals_repo = referrals_repo

    def evaluate_user(self, user: dict, program_id: str) -> dict:
        """
        Evaluate a user against a gamification program and persist the result.

        Returns the updated profile dict.
        Emits a 'level_up' event if the achieved level changed.
        """
        user_id = user.get("id")
        if not user_id:
            raise ValueError("User dict must contain an 'id' field")

        # Load program and its levels
        program = self.repo.get_program(program_id)
        if not program:
            raise ValueError(f"Gamification program '{program_id}' not found")

        levels = self.repo.get_levels_for_program(program_id)
        if not levels:
            log.warning(f"No levels configured for program {program_id}")
            return {}

        # Build metrics snapshot
        metrics = _resolve_metrics(user, program_id, self.user_repo, self.referrals_repo)
        log.info(f"Evaluating user={user_id} program={program_id} metrics={metrics}")

        # Determine achieved level
        achieved = _find_achieved_level(levels, metrics)
        if not achieved:
            log.warning(f"User {user_id} did not achieve any level in {program_id}")
            return {}

        now = _utc_now()

        # Load or initialize profile
        existing_profile = self.repo.get_profile(user_id, program_id)
        is_new = existing_profile is None

        previous_level_id = None if is_new else existing_profile.get("current_level_id")
        previous_level_code = None if is_new else existing_profile.get("current_level_code")

        # Determine next level (the one right after the achieved one)
        next_level = _find_next_level(levels, achieved)

        profile: dict = {
            "user_id": user_id,
            "program_id": program_id,
            "current_level_id": achieved["id"],
            "current_level_code": achieved.get("code"),
            "current_level_order": achieved.get("level_order"),
            "last_evaluated_at": now,
            "last_level_up_at": (
                now if is_new or achieved["id"] != previous_level_id
                else existing_profile.get("last_level_up_at")
            ),
            "metrics_snapshot": metrics,
            "created_at": (existing_profile or {}).get("created_at", now),
            "updated_at": now,
        }

        self.repo.save_profile(profile)

        # Emit level-up event if the level actually changed (or is brand new)
        level_changed = is_new or (achieved["id"] != previous_level_id)
        if level_changed:
            event = {
                "user_id": user_id,
                "event_type": "level_up",
                "program_id": program_id,
                "from_level_code": previous_level_code,
                "to_level_code": achieved.get("code"),
                "seen": False,
                "created_at": now,
                "seen_at": None,
                "payload": {
                    "from_level_order": None if is_new else existing_profile.get("current_level_order"),
                    "to_level_order": achieved.get("level_order"),
                    "level_name": achieved.get("name"),
                },
            }
            self.repo.create_event(event)
            log.info(
                f"Level-up event created: user={user_id} {previous_level_code} → {achieved.get('code')}"
            )

        return profile

    def get_me(self, user: dict, program_id: str) -> dict:
        """
        Return the enriched gamification view for a user:
          - current profile
          - current level details
          - next level details (if any)
          - progress indicators toward next level (where feasible)
          - first pending (unseen) level-up event
        """
        user_id = user.get("id")
        profile = self.repo.get_profile(user_id, program_id)
        levels = self.repo.get_levels_for_program(program_id)

        if not profile or not levels:
            return {"profile": None, "levels": levels}

        current_level = next(
            (lvl for lvl in levels if lvl["id"] == profile.get("current_level_id")),
            None,
        )
        next_level = _find_next_level(levels, current_level) if current_level else None

        # Build progress toward next level (only for numeric metrics with >= or > rules)
        progress = _compute_progress(profile.get("metrics_snapshot", {}), next_level)

        # Fetch first pending event
        pending_events = self.repo.get_pending_events(user_id, program_id)
        pending_event = pending_events[0] if pending_events else None

        return {
            "profile": profile,
            "current_level": current_level,
            "next_level": next_level,
            "progress": progress,
            "pending_event": pending_event,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_next_level(levels: List[dict], current: Optional[dict]) -> Optional[dict]:
    if not current:
        return None
    current_order = current.get("level_order", 0)
    candidates = [lvl for lvl in levels if lvl.get("level_order", 0) > current_order]
    return min(candidates, key=lambda lvl: lvl.get("level_order", 0)) if candidates else None


def _compute_progress(metrics: Dict[str, Any], next_level: Optional[dict]) -> List[dict]:
    """
    For each numeric rule in the next level, compute how far the user is.
    Returns a list of progress items.
    """
    if not next_level:
        return []

    items = []
    for rule in next_level.get("rules", []):
        metric = rule.get("metric")
        threshold = rule.get("value")
        operator = rule.get("operator", ">=")

        if operator not in (">=", ">"):
            continue  # Only produce progress for ascending numeric metrics

        actual = metrics.get(metric, 0)
        if not isinstance(threshold, (int, float)):
            continue

        items.append({
            "metric": metric,
            "current": actual,
            "required": threshold,
            "met": _OPERATORS[operator](actual, threshold),
        })

    return items
