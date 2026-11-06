"""
Comprehensive tests for the shared geographic catalog, hierarchical professional
coverage normalization, multi-location matching & ranking, deterministic
pagination, unconfigured professional exclusion, and service request validation.
"""
import asyncio
from typing import Dict, List, Optional
from unittest.mock import MagicMock

import pytest

from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.domain.services.geo_service import GeoCatalog, get_geo_catalog
from app.domain.services.request_service import RequestService
from app.domain.services.user_service import UserService


# ---------------------------------------------------------------------------
# 1. Geographic Catalog Integrity Tests
# ---------------------------------------------------------------------------

def test_catalog_loads_and_has_valid_structure():
    catalog = get_geo_catalog()
    raw = catalog.to_dict()
    assert "version" in raw
    areas = raw.get("areas", [])
    assert len(areas) > 0

    ids = set()
    for a in areas:
        aid = a["id"]
        assert aid not in ids, f"Duplicate ID {aid}"
        ids.add(aid)

    # Verify parent chains & stored ancestors match computed parent traversal
    for a in areas:
        area = catalog.get_area(a["id"])
        assert area is not None
        computed_ancestors = []
        curr = area.parent_id
        visited = {area.id}
        while curr is not None:
            assert curr not in visited, f"Cycle detected at {curr}"
            visited.add(curr)
            parent_area = catalog.get_area(curr)
            assert parent_area is not None, f"Missing parent {curr} for {area.id}"
            computed_ancestors.append(curr)
            curr = parent_area.parent_id
        computed_ancestors.reverse()
        assert list(area.ancestors) == computed_ancestors, (
            f"Ancestors mismatch for {area.id}: stored={area.ancestors}, computed={computed_ancestors}"
        )

    # Verify all 15 CABA comunas and all 48 CABA barrios are present
    caba_comunas = [a for a in areas if a["tipo"] == "comuna" and a["parent_id"] == "ar-c"]
    caba_barrios = [a for a in areas if a["tipo"] == "barrio" and "ar-c" in a["ancestors"]]
    assert len(caba_comunas) == 15
    assert len(caba_barrios) == 48

    # Verify all 24 official GBA partidos and 197 official INDEC/Georef localities are present
    gba_partidos = [a for a in areas if a["tipo"] == "partido" and a["parent_id"] == "ar-b"]
    gba_localidades = [a for a in areas if a["tipo"] == "localidad" and "ar-b" in a["ancestors"]]
    assert len(gba_partidos) == 24
    assert len(gba_localidades) == 197
    assert len(areas) == 287

    # Verify every GBA partido has at least one official locality
    partido_ids = {p["id"] for p in gba_partidos}
    for pid in partido_ids:
        children = [loc for loc in gba_localidades if loc["parent_id"] == pid]
        assert len(children) >= 1, f"Partido {pid} has no localities"

    # Verify client-selectable areas are strictly leaves (barrio or localidad)
    for a in areas:
        if a.get("selectable_by_client"):
            assert a["tipo"] in ("barrio", "localidad"), (
                f"Non-leaf area {a['id']} ({a['tipo']}) marked selectable_by_client"
            )

    # Verify groupings only reference valid pro-selectable areas, do not alter parent_id,
    # and partition all 24 GBA partidos cleanly without duplicates
    agrupaciones = raw.get("agrupaciones", [])
    assert len(agrupaciones) == 3
    grouped_partidos: List[str] = []
    for grp in agrupaciones:
        assert grp["id"] not in ids
        for member_id in grp.get("miembros", []):
            member = catalog.get_area(member_id)
            assert member is not None and member.selectable_by_pro
            assert member.parent_id == "ar-b"
            grouped_partidos.append(member_id)
    assert len(grouped_partidos) == 24
    assert set(grouped_partidos) == partido_ids


def test_border_shared_localities_have_distinct_ids_and_isolated_inheritance():
    """
    Official INDEC/BAHRA localities that span across two adjacent partidos
    (e.g. Villa Adelina, Gerli, Tortuguitas, San Francisco Solano, Canning)
    must have distinct parent-scoped IDs and inherit only from their own partido.
    """
    catalog = get_geo_catalog()

    # Villa Adelina in Vicente López vs San Isidro
    va_vl = "ar-b-vicente-lopez-villa-adelina"
    va_si = "ar-b-san-isidro-villa-adelina"
    assert catalog.get_area(va_vl) is not None
    assert catalog.get_area(va_si) is not None
    assert catalog.covers_location(["ar-b-vicente-lopez"], va_vl) is True
    assert catalog.covers_location(["ar-b-vicente-lopez"], va_si) is False
    assert catalog.covers_location(["ar-b-san-isidro"], va_si) is True
    assert catalog.covers_location(["ar-b-san-isidro"], va_vl) is False

    # Gerli in Avellaneda vs Lanús
    assert catalog.covers_location(["ar-b-avellaneda"], "ar-b-avellaneda-gerli") is True
    assert catalog.covers_location(["ar-b-avellaneda"], "ar-b-lanus-gerli") is False

    # Canning in Esteban Echeverría vs Ezeiza
    assert catalog.covers_location(["ar-b-ezeiza"], "ar-b-ezeiza-canning") is True
    assert catalog.covers_location(["ar-b-ezeiza"], "ar-b-esteban-echeverria-canning") is False


# ---------------------------------------------------------------------------
# 2. Professional Coverage Validation & Normalization Tests
# ---------------------------------------------------------------------------

def test_normalize_collapses_overlapping_parent_and_child_selections():
    catalog = get_geo_catalog()

    # Selecting CABA + Comuna 14 + Palermo collapses to ["ar-c"]
    normalized = catalog.validate_and_normalize_pro_coverage(
        ["ar-c-palermo", "ar-c", "ar-c-comuna-14"]
    )
    assert normalized == ["ar-c"]

    # Selecting Comuna 2 + Recoleta + Olivos collapses Comuna 2/Recoleta to Comuna 2 and keeps Olivos
    normalized_mixed = catalog.validate_and_normalize_pro_coverage(
        ["ar-c-recoleta", "ar-c-comuna-2", "ar-b-vicente-lopez-olivos", "ar-c-recoleta"]
    )
    assert normalized_mixed == ["ar-c-comuna-2", "ar-b-vicente-lopez-olivos"]


def test_invalid_or_legacy_strings_rejected_for_professional_coverage():
    catalog = get_geo_catalog()

    # Arbitrary legacy strings must NOT be silently coerced into IDs
    with pytest.raises(ValueError, match="no existe"):
        catalog.validate_and_normalize_pro_coverage(["Palermo"])

    # Non-selectable root areas (Argentina, Provincia de Buenos Aires) rejected
    with pytest.raises(ValueError, match="no es seleccionable"):
        catalog.validate_and_normalize_pro_coverage(["ar"])

    with pytest.raises(ValueError, match="no es seleccionable"):
        catalog.validate_and_normalize_pro_coverage(["ar-b"])

    # Empty selection rejected
    with pytest.raises(ValueError, match="al menos una zona"):
        catalog.validate_and_normalize_pro_coverage([])


def test_derive_coverage_ancestors_extensibility():
    catalog = get_geo_catalog()
    ancestors = catalog.derive_coverage_ancestors(["ar-b-vicente-lopez-olivos"])
    assert set(ancestors) == {
        "ar",
        "ar-b",
        "ar-b-vicente-lopez",
        "ar-b-vicente-lopez-olivos",
    }


# ---------------------------------------------------------------------------
# 3. Hierarchical Matching Correctness Matrix (All 8 Required Cases)
# ---------------------------------------------------------------------------

def test_hierarchical_matching_all_eight_cases():
    catalog = get_geo_catalog()

    # Case 1: Professional selecting CABA matches client searching Palermo
    assert catalog.covers_location(["ar-c"], "ar-c-palermo") is True

    # Case 2: Professional selecting Comuna 2 matches Recoleta
    assert catalog.covers_location(["ar-c-comuna-2"], "ar-c-recoleta") is True
    assert catalog.covers_location(["ar-c-comuna-2"], "ar-c-palermo") is False

    # Case 3: Professional selecting Vicente López matches Olivos
    assert catalog.covers_location(["ar-b-vicente-lopez"], "ar-b-vicente-lopez-olivos") is True

    # Case 4: Professional selecting Olivos and Martínez matches both independently
    matched = catalog.compute_matched_locations(
        ["ar-b-vicente-lopez-olivos", "ar-b-san-isidro-martinez"],
        ["ar-b-vicente-lopez-olivos", "ar-b-san-isidro-martinez"],
    )
    assert matched == ["ar-b-vicente-lopez-olivos", "ar-b-san-isidro-martinez"]

    # Case 5: Professional selecting CABA and Palermo is NOT counted twice for Palermo
    matched_dup = catalog.compute_matched_locations(
        ["ar-c", "ar-c-palermo"],
        ["ar-c-palermo"],
    )
    assert matched_dup == ["ar-c-palermo"]
    assert len(matched_dup) == 1

    # Case 6: Professional selecting only Olivos does NOT falsely cover all of Vicente López
    assert catalog.covers_location(["ar-b-vicente-lopez-olivos"], "ar-b-vicente-lopez-olivos") is True
    assert catalog.covers_location(["ar-b-vicente-lopez-olivos"], "ar-b-vicente-lopez-munro") is False
    matched_partial = catalog.compute_matched_locations(
        ["ar-b-vicente-lopez-olivos"],
        ["ar-b-vicente-lopez-olivos", "ar-b-vicente-lopez-munro"],
    )
    assert matched_partial == ["ar-b-vicente-lopez-olivos"]

    # Case 7: Adding a new locality under an existing parent automatically extends coverage
    raw_copy = {
        "version": "test-ext",
        "areas": list(catalog.to_dict()["areas"]) + [
            {
                "id": "ar-b-vicente-lopez-nueva-localidad",
                "nombre": "Nueva Localidad",
                "tipo": "localidad",
                "parent_id": "ar-b-vicente-lopez",
                "ancestors": ["ar", "ar-b", "ar-b-vicente-lopez"],
                "selectable_by_pro": True,
                "selectable_by_client": True,
                "activo": True,
                "orden": 20199,
            }
        ],
    }
    extended_catalog = GeoCatalog(raw_copy)
    # Pro stored ["ar-b-vicente-lopez"] before the locality existed -> automatically covers it
    assert extended_catalog.covers_location(
        ["ar-b-vicente-lopez"], "ar-b-vicente-lopez-nueva-localidad"
    ) is True

    # Case 8: Professionals covering none of the selected locations never match
    assert catalog.compute_matched_locations(
        ["ar-c-caballito"],
        ["ar-b-vicente-lopez-olivos", "ar-b-san-isidro-martinez"],
    ) == []


def test_client_search_rejects_parent_areas_and_invalid_ids():
    catalog = get_geo_catalog()

    # Parent areas (CABA, Vicente López, Comuna 14) cannot be final search locations
    with pytest.raises(ValueError, match="área padre"):
        catalog.validate_client_search_locations(["ar-c"])

    with pytest.raises(ValueError, match="área padre"):
        catalog.validate_client_search_locations(["ar-b-vicente-lopez"])

    with pytest.raises(ValueError, match="no existe"):
        catalog.validate_client_search_locations(["Palermo"])


# ---------------------------------------------------------------------------
# 4. Multi-Location Search, Ranking, Pagination & Exclusion Tests
# ---------------------------------------------------------------------------

class FakeDocSnapshot:
    def __init__(self, doc_id: str, data: dict):
        self.id = doc_id
        self._data = data

    def to_dict(self) -> dict:
        return dict(self._data)


class FakeFirestoreQuery:
    def __init__(self, docs: Dict[str, dict]):
        self._docs = docs
        self._filters = []

    def where(self, field: str, op: str, value):
        new_q = FakeFirestoreQuery(self._docs)
        new_q._filters = list(self._filters) + [(field, op, value)]
        return new_q

    def stream(self):
        results = []
        for doc_id, data in self._docs.items():
            match = True
            for field, op, value in self._filters:
                doc_val = data.get(field)
                if op == "==":
                    if doc_val != value:
                        match = False
                        break
                elif op == "array_contains":
                    if not isinstance(doc_val, list) or value not in doc_val:
                        match = False
                        break
                elif op == "array_contains_any":
                    if not isinstance(doc_val, list) or not any(v in doc_val for v in value):
                        match = False
                        break
            if match:
                results.append(FakeDocSnapshot(doc_id, data))
        return results


def _build_fake_user_repo(docs: Dict[str, dict]) -> FirebaseUserRepository:
    repo = FirebaseUserRepository.__new__(FirebaseUserRepository)
    repo.geo_catalog = get_geo_catalog()
    repo.collection = FakeFirestoreQuery(docs)
    return repo


def test_multi_location_ranking_olivos_martinez_munro():
    """
    Validates the exact prompt scenario:
      Client selects Olivos, Martínez, and Munro.
      - Pro A covers all 3 (via Vicente López parent + Martínez leaf) -> 3/3 (1st)
      - Pro B covers Olivos and Munro -> 2/3 (2nd)
      - Pro C covers Martínez -> 1/3 (3rd)
      - Pro D covers Palermo -> 0/3 (Excluded)
      - Pro E has only legacy `zonas: ["Olivos"]` and no `cobertura_ids` -> Excluded
    """
    docs = {
        "pro_c": {
            "nombre": "Carlos",
            "tipo": "profesional",
            "cobertura_ids": ["ar-b-san-isidro-martinez"],
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "promedioCalificacion": 5.0,
        },
        "pro_a": {
            "nombre": "Alberto",
            "tipo": "profesional",
            "cobertura_ids": ["ar-b-vicente-lopez", "ar-b-san-isidro-martinez"],
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "promedioCalificacion": 4.0,
        },
        "pro_b": {
            "nombre": "Bruno",
            "tipo": "profesional",
            "cobertura_ids": ["ar-b-vicente-lopez-olivos", "ar-b-vicente-lopez-munro"],
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "promedioCalificacion": 4.5,
        },
        "pro_d": {
            "nombre": "Daniel",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c-palermo"],
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "promedioCalificacion": 5.0,
        },
        "pro_legacy_unconfigured": {
            "nombre": "Esteban Legacy",
            "tipo": "profesional",
            "zonas": ["Belgrano", "Palermo"],  # No cobertura_ids configured yet
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "promedioCalificacion": 5.0,
        },
    }

    repo = _build_fake_user_repo(docs)
    searched = [
        "ar-b-vicente-lopez-olivos",
        "ar-b-san-isidro-martinez",
        "ar-b-vicente-lopez-munro",
    ]
    results = repo.buscar_profesionales(
        ubicaciones=searched,
        categoria="Plomería",
        subcategorias=None,
        limit=10,
    )

    assert [r["id"] for r in results] == ["pro_a", "pro_b", "pro_c"]

    assert results[0]["matched_locations_count"] == 3
    assert results[0]["total_searched_locations"] == 3
    assert results[0]["matched_location_ids"] == searched
    assert results[0]["matched_location_names"] == ["Olivos", "Martínez", "Munro"]

    assert results[1]["matched_locations_count"] == 2
    assert results[1]["matched_location_ids"] == [
        "ar-b-vicente-lopez-olivos",
        "ar-b-vicente-lopez-munro",
    ]

    assert results[2]["matched_locations_count"] == 1
    assert results[2]["matched_location_ids"] == ["ar-b-san-isidro-martinez"]


def test_deterministic_tie_breaking_and_cursor_pagination():
    """
    Within the same coverage tier, results must sort by:
      promedioCalificacion DESC, nombre.lower() ASC, id ASC
    and paginate deterministically using `start_after_id`.
    """
    docs = {
        "pro_1": {
            "nombre": "Zulma",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c"],  # matches 2/2
            "promedioCalificacion": 4.2,
        },
        "pro_2": {
            "nombre": "Ana",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c"],  # matches 2/2, higher rating
            "promedioCalificacion": 4.9,
        },
        "pro_3": {
            "nombre": "Beatriz",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c"],  # matches 2/2, same rating as pro_1, alphabetically before Zulma
            "promedioCalificacion": 4.2,
        },
        "pro_4": {
            "nombre": "Carlos",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c-palermo"],  # matches 1/2
            "promedioCalificacion": 5.0,
        },
    }

    repo = _build_fake_user_repo(docs)
    searched = ["ar-c-palermo", "ar-c-belgrano"]

    page_1 = repo.buscar_profesionales(searched, None, None, limit=2)
    assert [r["id"] for r in page_1] == ["pro_2", "pro_3"]

    page_2 = repo.buscar_profesionales(
        searched, None, None, limit=2, start_after_id=page_1[-1]["id"]
    )
    assert [r["id"] for r in page_2] == ["pro_1", "pro_4"]


def test_unconfigured_professional_excluded_even_in_category_only_search():
    docs = {
        "pro_configured": {
            "nombre": "Configurado",
            "tipo": "profesional",
            "cobertura_ids": ["ar-c-palermo"],
            "categorias": ["Electricidad"],
        },
        "pro_unconfigured": {
            "nombre": "Sin Configurar",
            "tipo": "profesional",
            "zonas": ["Palermo"],  # legacy only, no cobertura_ids
            "categorias": ["Electricidad"],
        },
    }
    repo = _build_fake_user_repo(docs)
    results = repo.buscar_profesionales(ubicaciones=[], categoria="Electricidad", subcategorias=None)
    assert [r["id"] for r in results] == ["pro_configured"]

    # Also verify enrich_professional_profile sets requires_coverage_setup=True
    catalog = get_geo_catalog()
    enriched = catalog.enrich_professional_profile(dict(docs["pro_unconfigured"]))
    assert enriched["requires_coverage_setup"] is True
    assert enriched["cobertura_ids"] == []


# ---------------------------------------------------------------------------
# 5. Service Request Coverage Validation Tests
# ---------------------------------------------------------------------------

def test_request_creation_validates_professional_coverage():
    mock_request_repo = MagicMock()

    async def fake_save(data):
        saved = dict(data)
        saved["id"] = "req_999"
        return saved

    mock_request_repo.save_request.side_effect = fake_save
    service = RequestService(mock_request_repo)

    pro_caba_and_vl = {
        "id": "pro_1",
        "tipo": "profesional",
        "cobertura_ids": ["ar-c", "ar-b-vicente-lopez"],
    }

    # 1. Valid request in Palermo (covered via ar-c parent)
    res1 = asyncio.run(
        service.crear_solicitud(
            solicitante_id="cli_1",
            profesional_id="pro_1",
            zona="ar-c-palermo",
            zona_id="ar-c-palermo",
            profesional_data=pro_caba_and_vl,
            subcategoria="Plomero",
            descripcion="Arreglo caño",
            fotos_urls=[],
        )
    )
    assert res1["zona_id"] == "ar-c-palermo"
    assert res1["zona_nombre"] == "Palermo"
    assert res1["zona"] == "Palermo"

    # 2. Valid request in Olivos (covered via ar-b-vicente-lopez parent)
    res2 = asyncio.run(
        service.crear_solicitud(
            solicitante_id="cli_1",
            profesional_id="pro_1",
            zona="ar-b-vicente-lopez-olivos",
            zona_id="ar-b-vicente-lopez-olivos",
            profesional_data=pro_caba_and_vl,
            subcategoria="Plomero",
            descripcion="Arreglo tanque",
            fotos_urls=[],
        )
    )
    assert res2["zona_id"] == "ar-b-vicente-lopez-olivos"
    assert res2["zona_nombre"] == "Olivos"

    # 3. Rejected: location not covered by professional (Martínez is in San Isidro)
    with pytest.raises(ValueError, match="no brinda cobertura"):
        asyncio.run(
            service.crear_solicitud(
                solicitante_id="cli_1",
                profesional_id="pro_1",
                zona="ar-b-san-isidro-martinez",
                zona_id="ar-b-san-isidro-martinez",
                profesional_data=pro_caba_and_vl,
                subcategoria="Plomero",
                descripcion="Fuera de zona",
                fotos_urls=[],
            )
        )

    # 4. Rejected: parent area ID passed instead of concrete neighborhood/locality
    with pytest.raises(ValueError, match="barrio o localidad específica"):
        asyncio.run(
            service.crear_solicitud(
                solicitante_id="cli_1",
                profesional_id="pro_1",
                zona="ar-c",
                zona_id="ar-c",
                profesional_data=pro_caba_and_vl,
                subcategoria="Plomero",
                descripcion="Área padre",
                fotos_urls=[],
            )
        )

    # 5. Rejected: professional has no valid coverage configured
    pro_unconfigured = {"id": "pro_2", "tipo": "profesional", "zonas": ["Palermo"]}
    with pytest.raises(ValueError, match="no brinda cobertura"):
        asyncio.run(
            service.crear_solicitud(
                solicitante_id="cli_1",
                profesional_id="pro_2",
                zona="ar-c-palermo",
                zona_id="ar-c-palermo",
                profesional_data=pro_unconfigured,
                subcategoria="Plomero",
                descripcion="Pro sin cobertura",
                fotos_urls=[],
            )
        )


# ---------------------------------------------------------------------------
# 6. End-to-End Workflows: Registration, Coverage Update, Large Searches & History
# ---------------------------------------------------------------------------

def test_e2e_professional_registration_update_and_onboarding():
    """
    Verifies workflows 1, 2, and 3:
      1. Professional registration with individual and parent-area coverage.
      2. Updating professional coverage (with overlapping parent/child normalization).
      3. Mandatory coverage setup for existing professionals and clearing the flag once configured.
    """
    from app.api.schemas.user_schema import UsuarioUpdate

    stored_users: Dict[str, dict] = {
        "existing_legacy_pro": {
            "id": "existing_legacy_pro",
            "nombre": "Roberto",
            "apellido": "Gómez",
            "email": "roberto@example.com",
            "tipo": "profesional",
            "categorias": ["Plomería"],
            "subcategorias": ["Plomero"],
            "zonas": ["Belgrano", "Palermo"],  # Legacy string array, no cobertura_ids
        }
    }

    mock_repo = MagicMock()
    mock_repo.get_user_by_id.side_effect = lambda uid: (
        dict(stored_users[uid]) if uid in stored_users else None
    )

    def fake_save(data):
        doc = dict(data)
        stored_users[doc["id"]] = doc
        return dict(doc)

    mock_repo.save_user.side_effect = fake_save

    user_service = UserService(user_repository=mock_repo)

    # Workflow 1: Register new professional with parent (ar-b-tigre) + leaf (ar-c-belgrano)
    # and overlapping child (ar-b-tigre-general-pacheco) -> normalized to ["ar-c-belgrano", "ar-b-tigre"]
    user_service.registrar_usuario(
        {
            "id": "new_pro_1",
            "email": "nuevo@example.com",
            "nombre": "Lucía",
            "apellido": "Pérez",
            "tipo": "profesional",
            "cobertura_ids": ["ar-b-tigre", "ar-b-tigre-general-pacheco", "ar-c-belgrano"],
            "categorias": ["Electricidad"],
            "subcategorias": ["Electricista"],
        }
    )
    created = user_service.obtener_usuario("new_pro_1")
    assert created["cobertura_ids"] == ["ar-b-tigre", "ar-c-belgrano"]
    assert created["cobertura_nombres"] == ["Tigre", "Belgrano"]
    assert created["requires_coverage_setup"] is False

    # Workflow 2: Update professional coverage to all of CABA + San Isidro
    updated = user_service.actualizar_usuario(
        uid="new_pro_1",
        datos=UsuarioUpdate(
            cobertura_ids=["ar-c", "ar-c-palermo", "ar-b-san-isidro"],
        ),
    )
    assert updated["cobertura_ids"] == ["ar-c", "ar-b-san-isidro"]
    assert updated["cobertura_nombres"] == ["CABA", "San Isidro"]
    assert updated["requires_coverage_setup"] is False

    # Workflow 3: Existing legacy professional without valid cobertura_ids gets requires_coverage_setup=True
    legacy_profile = user_service.obtener_usuario("existing_legacy_pro")
    assert legacy_profile["requires_coverage_setup"] is True
    assert legacy_profile["cobertura_ids"] == []

    # Once existing professional configures coverage, requires_coverage_setup becomes False
    reconfigured = user_service.actualizar_usuario(
        uid="existing_legacy_pro",
        datos=UsuarioUpdate(cobertura_ids=["ar-b-quilmes", "ar-b-avellaneda-gerli"]),
    )
    assert reconfigured["requires_coverage_setup"] is False
    assert reconfigured["cobertura_ids"] == ["ar-b-quilmes", "ar-b-avellaneda-gerli"]


def test_large_geographic_selection_exceeding_30_tokens_chunks_and_deduplicates():
    """
    Verifies client search when selecting all 70 localities across the 8 partidos
    of Zona Norte GBA (> 30 Firestore `array_contains_any` query tokens).
    Ensures:
      - Query tokens (70 localities + 8 parent partidos = 78 tokens) are chunked into batches <= 30.
      - A professional matching multiple chunks is deduplicated and ranked by exact matched leaf count.
    """
    catalog = get_geo_catalog()
    zona_norte_grp = next(
        g for g in catalog.to_dict()["agrupaciones"] if g["id"] == "grp-gba-norte"
    )
    assert len(zona_norte_grp["miembros"]) == 8

    # Collect all client-selectable leaves under the 8 Zona Norte partidos
    zn_leaves = []
    for pid in zona_norte_grp["miembros"]:
        for leaf in catalog.expand_pro_coverage_to_client_leaves([pid]):
            zn_leaves.append(leaf["id"])
    assert len(zn_leaves) == 70

    validated_leaves, _, query_tokens = catalog.build_search_query_tokens(zn_leaves)
    assert len(validated_leaves) == 70
    assert len(query_tokens) == 78  # 70 leaves + 8 parent partidos (> 30 Firestore limit)

    docs = {
        "pro_two_partidos": {
            "nombre": "Pro Norte Amplio",
            "tipo": "profesional",
            # Covers Vicente López (9 leaves) + San Isidro (6 leaves) = 15 leaves across different chunks
            "cobertura_ids": ["ar-b-vicente-lopez", "ar-b-san-isidro"],
            "categorias": ["Plomería"],
            "promedioCalificacion": 4.5,
        },
        "pro_one_partido": {
            "nombre": "Pro Tigre",
            "tipo": "profesional",
            # Covers Tigre (10 leaves)
            "cobertura_ids": ["ar-b-tigre"],
            "categorias": ["Plomería"],
            "promedioCalificacion": 5.0,
        },
        "pro_single_leaf": {
            "nombre": "Pro Bella Vista",
            "tipo": "profesional",
            # Covers 1 leaf in San Miguel (Zona Norte)
            "cobertura_ids": ["ar-b-san-miguel-bella-vista"],
            "categorias": ["Plomería"],
            "promedioCalificacion": 5.0,
        },
    }

    repo = _build_fake_user_repo(docs)
    results = repo.buscar_profesionales(
        ubicaciones=zn_leaves,
        categoria="Plomería",
        subcategorias=None,
        limit=10,
    )

    assert [r["id"] for r in results] == [
        "pro_two_partidos",
        "pro_one_partido",
        "pro_single_leaf",
    ]
    assert results[0]["matched_locations_count"] == 15
    assert results[0]["total_searched_locations"] == 70
    assert results[1]["matched_locations_count"] == 10
    assert results[2]["matched_locations_count"] == 1


def test_historical_requests_preserve_legacy_zona_display():
    """
    Verifies workflow 9: historical requests stored before geographic IDs
    (with only `zona: "Belgrano"` and no `zona_id` or `zona_nombre`) remain
    intact and readable alongside new requests.
    """
    mock_request_repo = MagicMock()
    mock_request_repo.listar_por_solicitante.return_value = [
        {
            "id": "req_legacy_1",
            "solicitante_id": "cli_1",
            "profesional_id": "pro_1",
            "zona": "Belgrano",
            "subcategoria": "Plomero",
            "estado": "finalizado",
        },
        {
            "id": "req_new_2",
            "solicitante_id": "cli_1",
            "profesional_id": "pro_1",
            "zona": "Don Torcuato",
            "zona_id": "ar-b-tigre-don-torcuato",
            "zona_nombre": "Don Torcuato",
            "subcategoria": "Plomero",
            "estado": "pendiente",
        },
    ]

    service = RequestService(mock_request_repo)
    history = asyncio.run(service.listar_solicitudes_por_solicitante("cli_1"))
    assert len(history) == 2
    assert history[0]["zona"] == "Belgrano"
    assert history[1]["zona_id"] == "ar-b-tigre-don-torcuato"
    assert history[1]["zona_nombre"] == "Don Torcuato"

