"""
Unit tests for the gamification domain service.

All tests run without Firebase. The GamificationRepository is replaced with an
in-memory stub so no network or credentials are needed.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import pytest

from app.domain.services.gamification_service import (
    GamificationService,
    evaluate_rules,
)
from app.ports.gamification_repository import GamificationRepository


# ---------------------------------------------------------------------------
# In-memory repository stub
# ---------------------------------------------------------------------------

class InMemoryGamificationRepo(GamificationRepository):
    def __init__(self, programs: Dict[str, dict], levels: List[dict]):
        self._programs = programs
        self._levels = levels
        self._profiles: Dict[str, dict] = {}
        self._events: List[dict] = []
        self._event_counter = 0

    def get_program(self, program_id: str) -> Optional[dict]:
        return self._programs.get(program_id)

    def get_levels_for_program(self, program_id: str) -> List[dict]:
        return sorted(
            [lvl for lvl in self._levels if lvl["program_id"] == program_id],
            key=lambda l: l["level_order"],
        )

    def get_profile(self, user_id: str, program_id: str) -> Optional[dict]:
        return self._profiles.get(f"{user_id}_{program_id}")

    def save_profile(self, profile: dict) -> None:
        key = f"{profile['user_id']}_{profile['program_id']}"
        self._profiles[key] = profile

    def create_event(self, event: dict) -> str:
        self._event_counter += 1
        event_id = f"evt_{self._event_counter}"
        event["id"] = event_id
        self._events.append(event)
        return event_id

    def get_pending_events(self, user_id: str, program_id: str) -> List[dict]:
        return [
            e for e in self._events
            if e["user_id"] == user_id
            and e["program_id"] == program_id
            and not e["seen"]
        ]

    def mark_event_seen(self, event_id: str, seen_at: str) -> None:
        for e in self._events:
            if e["id"] == event_id:
                e["seen"] = True
                e["seen_at"] = seen_at

    def get_event(self, event_id: str) -> Optional[dict]:
        return next((e for e in self._events if e["id"] == event_id), None)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

PROF_PROGRAM = {
    "id": "professional_reputation",
    "name": "Reputación Profesional",
    "target_tipo": "profesional",
}

CLIENT_PROGRAM = {
    "id": "client_reputation",
    "name": "Reputación de Cliente",
    "target_tipo": "cliente",
}

PROF_LEVELS = [
    {
        "id": "prof_rep_1",
        "program_id": "professional_reputation",
        "code": "registrado",
        "name": "Registrado",
        "level_order": 1,
        "rules": [],
        "rules_mode": "all",
    },
    {
        "id": "prof_rep_2",
        "program_id": "professional_reputation",
        "code": "en_camino",
        "name": "En Camino",
        "level_order": 2,
        "rules": [
            {"metric": "completed_jobs_count", "operator": ">=", "value": 3},
            {"metric": "average_rating",        "operator": ">=", "value": 3.5},
        ],
        "rules_mode": "all",
    },
    {
        "id": "prof_rep_3",
        "program_id": "professional_reputation",
        "code": "confiable",
        "name": "Confiable",
        "level_order": 3,
        "rules": [
            {"metric": "completed_jobs_count", "operator": ">=", "value": 10},
            {"metric": "average_rating",        "operator": ">=", "value": 4.0},
            {"metric": "profile_completed",     "operator": "==", "value": True},
        ],
        "rules_mode": "all",
    },
]

CLIENT_LEVELS = [
    {
        "id": "cli_rep_1",
        "program_id": "client_reputation",
        "code": "vecino",
        "name": "Vecino",
        "level_order": 1,
        "rules": [],
        "rules_mode": "all",
    },
    {
        "id": "cli_rep_2",
        "program_id": "client_reputation",
        "code": "colaborador",
        "name": "Colaborador",
        "level_order": 2,
        "rules": [
            {"metric": "recommended_professionals_count", "operator": ">=", "value": 1},
        ],
        "rules_mode": "all",
    },
    {
        "id": "cli_rep_3",
        "program_id": "client_reputation",
        "code": "referente",
        "name": "Referente",
        "level_order": 3,
        "rules": [
            {"metric": "recommended_professionals_count",      "operator": ">=", "value": 3},
            {"metric": "recommended_professionals_avg_rating", "operator": ">=", "value": 4.0},
        ],
        "rules_mode": "all",
    },
]


def _make_prof_service() -> GamificationService:
    repo = InMemoryGamificationRepo(
        programs={"professional_reputation": PROF_PROGRAM},
        levels=PROF_LEVELS,
    )
    return GamificationService(repo)


def _make_client_service() -> GamificationService:
    repo = InMemoryGamificationRepo(
        programs={"client_reputation": CLIENT_PROGRAM},
        levels=CLIENT_LEVELS,
    )
    return GamificationService(repo)


# ---------------------------------------------------------------------------
# Test 1: Professional level progression — reaches En Camino
# ---------------------------------------------------------------------------

def test_professional_level_progression_en_camino():
    """A professional with 5 jobs and 4.0 rating should reach 'En Camino'."""
    service = _make_prof_service()
    user = {
        "id": "prof_001",
        "tipo": "profesional",
        "cantidadCalificaciones": 5,
        "promedioCalificacion": 4.0,
        "nombre": "Juan",
        "foto": "url",
        "descripcion": "desc",
        "subcategorias": ["plomería"],
        "zonas": ["Palermo"],
        "phone_verified": False,
    }

    profile = service.evaluate_user(user, "professional_reputation")

    assert profile["current_level_code"] == "en_camino"
    assert profile["user_id"] == "prof_001"
    assert profile["program_id"] == "professional_reputation"


# ---------------------------------------------------------------------------
# Test 2: Professional level — stays at entry when rules are not met
# ---------------------------------------------------------------------------

def test_professional_no_level_up_when_rules_not_met():
    """A professional with 1 job should stay at 'Registrado' (entry level)."""
    service = _make_prof_service()
    user = {
        "id": "prof_002",
        "tipo": "profesional",
        "cantidadCalificaciones": 1,
        "promedioCalificacion": 3.0,
        "nombre": "María",
        "foto": None,
        "descripcion": None,
        "subcategorias": [],
        "zonas": [],
        "phone_verified": False,
    }

    profile = service.evaluate_user(user, "professional_reputation")

    assert profile["current_level_code"] == "registrado"


# ---------------------------------------------------------------------------
# Test 3: Client level progression — reaches Colaborador
# ---------------------------------------------------------------------------

def test_client_level_progression_colaborador():
    """
    Client metric adapter currently returns 0 for all recommendation metrics.
    The test patches the metric resolver so we can verify the level engine
    correctly promotes the user when a future adapter returns real values.
    """
    import app.domain.services.gamification_service as svc_module

    original = svc_module._resolve_client_metrics

    def patched_metrics(_user):
        return {
            "recommended_professionals_count": 2,
            "recommended_professionals_avg_rating": 4.2,
        }

    svc_module._resolve_client_metrics = patched_metrics
    try:
        service = _make_client_service()
        user = {"id": "cli_001", "tipo": "cliente"}
        profile = service.evaluate_user(user, "client_reputation")
        assert profile["current_level_code"] == "colaborador"
    finally:
        svc_module._resolve_client_metrics = original


# ---------------------------------------------------------------------------
# Test 4: Level-up event is created on first evaluation
# ---------------------------------------------------------------------------

def test_level_up_event_created_on_first_evaluation():
    """First evaluation of a new user must create a level-up event."""
    service = _make_prof_service()
    repo: InMemoryGamificationRepo = service.repo  # type: ignore[assignment]

    user = {
        "id": "prof_003",
        "tipo": "profesional",
        "cantidadCalificaciones": 0,
        "promedioCalificacion": 0.0,
        "phone_verified": False,
    }

    assert len(repo._events) == 0

    service.evaluate_user(user, "professional_reputation")

    assert len(repo._events) == 1
    event = repo._events[0]
    assert event["event_type"] == "level_up"
    assert event["user_id"] == "prof_003"
    assert event["seen"] is False
    assert event["to_level_code"] == "registrado"
    assert event["from_level_code"] is None  # first evaluation


# ---------------------------------------------------------------------------
# Test 5: mark_event_seen updates the event correctly
# ---------------------------------------------------------------------------

def test_mark_event_seen_updates_correctly():
    """Marking a pending event as seen must set seen=True and seen_at."""
    service = _make_prof_service()
    repo: InMemoryGamificationRepo = service.repo  # type: ignore[assignment]

    user = {
        "id": "prof_004",
        "tipo": "profesional",
        "cantidadCalificaciones": 0,
        "promedioCalificacion": 0.0,
        "phone_verified": False,
    }

    service.evaluate_user(user, "professional_reputation")
    assert len(repo._events) == 1

    event = repo._events[0]
    event_id = event["id"]
    assert event["seen"] is False

    seen_at = datetime.now(timezone.utc).isoformat()
    repo.mark_event_seen(event_id, seen_at)

    updated = repo.get_event(event_id)
    assert updated["seen"] is True
    assert updated["seen_at"] == seen_at


# ---------------------------------------------------------------------------
# Test 6 (bonus): evaluate_rules edge cases
# ---------------------------------------------------------------------------

def test_evaluate_rules_empty_always_true():
    """Empty rules must always return True (entry level contract)."""
    assert evaluate_rules([], {}, "all") is True


def test_evaluate_rules_all_must_pass():
    """All rules must pass in 'all' mode."""
    rules = [
        {"metric": "count", "operator": ">=", "value": 5},
        {"metric": "rating", "operator": ">=", "value": 4.0},
    ]
    assert evaluate_rules(rules, {"count": 5, "rating": 4.0}, "all") is True
    assert evaluate_rules(rules, {"count": 5, "rating": 3.9}, "all") is False
