"""
Seed script for gamification programs and levels.

Run once to populate Firestore:
    cd backend
    python -m app.scripts.seed_gamification

This script is idempotent: it uses .set() so re-running is safe.
"""
import sys
import os

# Allow running from the backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.adapters.firebase.firebase_config import get_firestore  # noqa: E402


# ---------------------------------------------------------------------------
# Program definitions
# ---------------------------------------------------------------------------

PROGRAMS = [
    {
        "id": "professional_reputation",
        "name": "Reputación Profesional",
        "target_tipo": "profesional",
        "description": "Programa de reconocimiento para profesionales de oficios.",
    },
    {
        "id": "client_reputation",
        "name": "Reputación de Cliente",
        "target_tipo": "cliente",
        "description": "Programa de reconocimiento para clientes que contratan profesionales.",
    },
]


# ---------------------------------------------------------------------------
# Level definitions
# ---------------------------------------------------------------------------

LEVELS = [
    # ------------------------------------------------------------------
    # Professional reputation
    # ------------------------------------------------------------------
    {
        "id": "prof_rep_1",
        "program_id": "professional_reputation",
        "code": "registrado",
        "name": "Registrado",
        "level_order": 1,
        "rules": [],           # entry level — always achieved
        "rules_mode": "all",
    },
    {
        "id": "prof_rep_2",
        "program_id": "professional_reputation",
        "code": "en_camino",
        "name": "En Camino",
        "level_order": 2,
        "rules": [
            # completed_jobs_count proxy: cantidadCalificaciones (see service docstring)
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
    {
        "id": "prof_rep_4",
        "program_id": "professional_reputation",
        "code": "experto_de_confianza",
        "name": "Experto de Confianza",
        "level_order": 4,
        "rules": [
            {"metric": "completed_jobs_count", "operator": ">=", "value": 30},
            {"metric": "average_rating",        "operator": ">=", "value": 4.5},
            # phone_verified: field not written yet — level will not be achieved
            # until the phone-verification flow is implemented.
            {"metric": "phone_verified",        "operator": "==", "value": True},
        ],
        "rules_mode": "all",
    },

    # ------------------------------------------------------------------
    # Client reputation
    # ------------------------------------------------------------------
    {
        "id": "cli_rep_1",
        "program_id": "client_reputation",
        "code": "vecino",
        "name": "Vecino",
        "level_order": 1,
        "rules": [],           # entry level — always achieved
        "rules_mode": "all",
    },
    {
        "id": "cli_rep_2",
        "program_id": "client_reputation",
        "code": "colaborador",
        "name": "Colaborador",
        "level_order": 2,
        "rules": [
            # recommended_professionals_count: returns 0 until recommendation
            # feature is built (see gamification_service.py for details).
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
    {
        "id": "cli_rep_4",
        "program_id": "client_reputation",
        "code": "curador_de_confianza",
        "name": "Curador de Confianza",
        "level_order": 4,
        "rules": [
            {"metric": "recommended_professionals_count",      "operator": ">=", "value": 10},
            {"metric": "recommended_professionals_avg_rating", "operator": ">=", "value": 4.5},
        ],
        "rules_mode": "all",
    },
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

def seed():
    db = get_firestore()

    print("Seeding gamification programs...")
    for program in PROGRAMS:
        doc_id = program["id"]
        db.collection("gamification_programs").document(doc_id).set(program)
        print(f"  ✔ program: {doc_id}")

    print("Seeding gamification levels...")
    for level in LEVELS:
        doc_id = level["id"]
        db.collection("gamification_levels").document(doc_id).set(level)
        print(f"  ✔ level: {doc_id} ({level['name']})")

    print("Done.")


if __name__ == "__main__":
    seed()
