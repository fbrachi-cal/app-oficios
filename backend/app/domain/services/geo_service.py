"""
Domain service for the shared geographic catalog, hierarchical professional
coverage normalization, multi-location matching, and service request location
validation.

All geographic matching and inheritance rules are isolated here so query
strategies can evolve (e.g., adding broad region searches) without altering API
contracts or re-architecting persisted professional coverage.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


DEFAULT_CATALOG_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "geo", "catalog.json"
)


@dataclass(frozen=True)
class GeoArea:
    id: str
    nombre: str
    tipo: str
    parent_id: Optional[str]
    ancestors: Tuple[str, ...]
    selectable_by_pro: bool
    selectable_by_client: bool
    activo: bool
    orden: int = 999
    nombre_corto: Optional[str] = None

    @property
    def display_name(self) -> str:
        return self.nombre_corto or self.nombre


class GeoCatalog:
    """
    In-memory representation of the authoritative geographic catalog.
    """

    def __init__(self, raw_catalog: Dict[str, Any]):
        self.version: str = raw_catalog.get("version", "1.0.0")
        self._raw = raw_catalog
        self._areas_by_id: Dict[str, GeoArea] = {}
        self._children_by_id: Dict[str, List[GeoArea]] = {}

        for item in raw_catalog.get("areas", []):
            area = GeoArea(
                id=item["id"],
                nombre=item["nombre"],
                nombre_corto=item.get("nombre_corto"),
                tipo=item["tipo"],
                parent_id=item.get("parent_id"),
                ancestors=tuple(item.get("ancestors", [])),
                selectable_by_pro=bool(item.get("selectable_by_pro", False)),
                selectable_by_client=bool(item.get("selectable_by_client", False)),
                activo=bool(item.get("activo", True)),
                orden=int(item.get("orden", 999)),
            )
            if area.id in self._areas_by_id:
                raise ValueError(f"Duplicate geographic area ID in catalog: {area.id}")
            self._areas_by_id[area.id] = area
            if area.parent_id:
                self._children_by_id.setdefault(area.parent_id, []).append(area)

        for children in self._children_by_id.values():
            children.sort(key=lambda a: (a.orden, a.nombre))

    @classmethod
    def from_file(cls, path: str = DEFAULT_CATALOG_PATH) -> "GeoCatalog":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    def to_dict(self) -> Dict[str, Any]:
        return self._raw

    def get_area(self, area_id: str) -> Optional[GeoArea]:
        if not isinstance(area_id, str):
            return None
        return self._areas_by_id.get(area_id.strip())

    def display_name(self, area_id: str) -> str:
        area = self.get_area(area_id)
        return area.display_name if area else area_id

    def full_name(self, area_id: str) -> str:
        area = self.get_area(area_id)
        return area.nombre if area else area_id

    # ------------------------------------------------------------------
    # Professional Coverage Validation & Normalization
    # ------------------------------------------------------------------

    def validate_and_normalize_pro_coverage(self, area_ids: Iterable[str]) -> List[str]:
        """
        Validates that every ID exists in the catalog, is active, and is
        selectable by a professional. Removes duplicates and collapses any
        descendant area whose ancestor is also selected.

        Raises ValueError if any ID is invalid, inactive, or not selectable by
        a professional, or if the resulting normalized list is empty.
        """
        if area_ids is None:
            raise ValueError("Debes seleccionar al menos una zona de cobertura válida.")

        validated: List[GeoArea] = []
        seen: Set[str] = set()

        for raw_id in area_ids:
            if not isinstance(raw_id, str) or not raw_id.strip():
                raise ValueError(f"Identificador geográfico inválido: {raw_id!r}")
            clean_id = raw_id.strip()
            area = self.get_area(clean_id)
            if not area or not area.activo:
                raise ValueError(f"La zona '{clean_id}' no existe o no está activa en el catálogo.")
            if not area.selectable_by_pro:
                raise ValueError(f"La zona '{area.nombre}' ({area.id}) no es seleccionable como área de cobertura.")
            if area.id not in seen:
                seen.add(area.id)
                validated.append(area)

        if not validated:
            raise ValueError("Debes seleccionar al menos una zona de cobertura válida.")

        # Collapse overlapping selections: remove any area that has an ancestor in `seen`
        normalized: List[GeoArea] = [
            area for area in validated
            if not any(anc in seen for anc in area.ancestors)
        ]

        # Sort deterministically by catalog order then ID
        normalized.sort(key=lambda a: (a.orden, a.id))
        return [a.id for a in normalized]

    def filter_valid_pro_coverage(self, area_ids: Optional[Iterable[str]]) -> List[str]:
        """
        Non-throwing helper for reading stored documents: returns only valid,
        active, pro-selectable area IDs normalized by ancestor collapse.
        """
        if not area_ids or not isinstance(area_ids, (list, tuple, set)):
            return []
        valid: List[GeoArea] = []
        seen: Set[str] = set()
        for raw_id in area_ids:
            if not isinstance(raw_id, str):
                continue
            area = self.get_area(raw_id.strip())
            if area and area.activo and area.selectable_by_pro and area.id not in seen:
                seen.add(area.id)
                valid.append(area)
        collapsed = [
            area for area in valid
            if not any(anc in seen for anc in area.ancestors)
        ]
        collapsed.sort(key=lambda a: (a.orden, a.id))
        return [a.id for a in collapsed]

    def derive_coverage_ancestors(self, normalized_pro_ids: Iterable[str]) -> List[str]:
        """
        Computes the union of each selected area and all its ancestors.
        Kept for future broad region searches (e.g., searching by an entire
        partido or region including partial coverage) without needing to change
        how professional selections are stored.
        """
        result: Set[str] = set()
        for aid in normalized_pro_ids:
            area = self.get_area(aid)
            if area:
                result.add(area.id)
                result.update(area.ancestors)
        return sorted(result)

    def expand_pro_coverage_to_client_leaves(self, pro_coverage_ids: Iterable[str]) -> List[Dict[str, Any]]:
        """
        Given a professional's `cobertura_ids`, returns all active client-selectable
        leaf areas covered (either directly selected or inherited from a selected
        parent/ancestor).
        """
        valid_pro_ids = set(self.filter_valid_pro_coverage(pro_coverage_ids))
        if not valid_pro_ids:
            return []

        leaves: List[GeoArea] = []
        for area in self._areas_by_id.values():
            if not area.activo or not area.selectable_by_client:
                continue
            if area.id in valid_pro_ids or any(anc in valid_pro_ids for anc in area.ancestors):
                leaves.append(area)

        leaves.sort(key=lambda a: (a.orden, a.nombre))
        return [
            {
                "id": a.id,
                "nombre": a.nombre,
                "tipo": a.tipo,
                "parent_id": a.parent_id,
                "parent_nombre": self.full_name(a.parent_id) if a.parent_id else None,
            }
            for a in leaves
        ]

    # ------------------------------------------------------------------
    # Client Search Validation & Multi-Location Matching
    # ------------------------------------------------------------------

    def validate_client_search_locations(self, location_ids: Optional[Iterable[str]]) -> List[str]:
        """
        Validates that every client search location is an active leaf area
        (`selectable_by_client == True`). Deduplicates while preserving order.
        """
        if not location_ids:
            return []
        result: List[str] = []
        seen: Set[str] = set()
        for raw_id in location_ids:
            if not isinstance(raw_id, str) or not raw_id.strip():
                raise ValueError(f"Ubicación de búsqueda inválida: {raw_id!r}")
            clean_id = raw_id.strip()
            area = self.get_area(clean_id)
            if not area or not area.activo:
                raise ValueError(f"La ubicación '{clean_id}' no existe o no está activa en el catálogo.")
            if not area.selectable_by_client:
                raise ValueError(
                    f"La ubicación '{area.nombre}' ({area.id}) es un área padre; "
                    "seleccioná barrios o localidades específicas."
                )
            if area.id not in seen:
                seen.add(area.id)
                result.append(area.id)
        return result

    def pro_selectable_ancestors_or_self(self, area_id: str) -> Set[str]:
        """
        Returns the set of catalog IDs that, if present in a professional's
        `cobertura_ids`, mean the professional covers `area_id`.
        """
        area = self.get_area(area_id)
        if not area or not area.activo:
            return set()
        tokens: Set[str] = set()
        if area.selectable_by_pro:
            tokens.add(area.id)
        for anc_id in area.ancestors:
            anc = self.get_area(anc_id)
            if anc and anc.activo and anc.selectable_by_pro:
                tokens.add(anc.id)
        return tokens

    def build_search_query_tokens(self, client_leaf_ids: Iterable[str]) -> Tuple[List[str], Dict[str, Set[str]], List[str]]:
        """
        Given raw client location IDs, validates them and returns:
          1. validated_leaf_ids: deduplicated list of leaf IDs in client order
          2. leaf_ancestor_sets: mapping {leaf_id -> set of covering pro IDs}
          3. query_tokens: sorted union of covering pro IDs across all leaves
             (used in Firestore `where("cobertura_ids", "array_contains_any", chunk)`)
        """
        validated_leaf_ids = self.validate_client_search_locations(client_leaf_ids)
        leaf_ancestor_sets: Dict[str, Set[str]] = {
            lid: self.pro_selectable_ancestors_or_self(lid)
            for lid in validated_leaf_ids
        }
        union_tokens: Set[str] = set()
        for token_set in leaf_ancestor_sets.values():
            union_tokens.update(token_set)
        return validated_leaf_ids, leaf_ancestor_sets, sorted(union_tokens)

    def compute_matched_locations(
        self,
        pro_cobertura_ids: Optional[Iterable[str]],
        validated_leaf_ids: List[str],
        leaf_ancestor_sets: Optional[Dict[str, Set[str]]] = None,
    ) -> List[str]:
        """
        Returns the ordered subset of `validated_leaf_ids` covered by the
        professional's `pro_cobertura_ids`. Each client leaf is counted at most
        once even if `pro_cobertura_ids` contains unnormalized overlapping IDs.
        """
        valid_pro_cov = set(self.filter_valid_pro_coverage(pro_cobertura_ids))
        if not valid_pro_cov or not validated_leaf_ids:
            return []

        if leaf_ancestor_sets is None:
            leaf_ancestor_sets = {
                lid: self.pro_selectable_ancestors_or_self(lid)
                for lid in validated_leaf_ids
            }

        return [
            lid for lid in validated_leaf_ids
            if bool(valid_pro_cov & leaf_ancestor_sets.get(lid, set()))
        ]

    def covers_location(self, pro_cobertura_ids: Optional[Iterable[str]], leaf_id: str) -> bool:
        """
        True iff a professional with `pro_cobertura_ids` covers `leaf_id`
        (directly or through an ancestor).
        """
        valid_pro_cov = set(self.filter_valid_pro_coverage(pro_cobertura_ids))
        if not valid_pro_cov:
            return False
        covering_ids = self.pro_selectable_ancestors_or_self(leaf_id)
        return bool(valid_pro_cov & covering_ids)

    # ------------------------------------------------------------------
    # Service Request Location Validation
    # ------------------------------------------------------------------

    def validate_request_location(
        self,
        pro_cobertura_ids: Optional[Iterable[str]],
        requested_area_id: str,
    ) -> GeoArea:
        """
        Validates that `requested_area_id` is a valid, active client-selectable
        leaf location and that the professional covers it.
        """
        if not isinstance(requested_area_id, str) or not requested_area_id.strip():
            raise ValueError("Debes seleccionar una ubicación válida para la solicitud.")

        clean_id = requested_area_id.strip()
        area = self.get_area(clean_id)
        if not area or not area.activo:
            raise ValueError(f"La ubicación seleccionada ('{clean_id}') no es válida.")
        if not area.selectable_by_client:
            raise ValueError(
                f"Debes seleccionar un barrio o localidad específica (no '{area.nombre}')."
            )

        if not self.covers_location(pro_cobertura_ids, area.id):
            raise ValueError(
                f"El profesional seleccionado no brinda cobertura en {area.nombre}."
            )

        return area

    def enrich_professional_profile(self, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enriches a user dictionary with canonical coverage metadata without
        mutating unrelated fields.
        """
        if not user_doc or user_doc.get("tipo") != "profesional":
            return user_doc

        valid_ids = self.filter_valid_pro_coverage(user_doc.get("cobertura_ids"))
        user_doc["cobertura_ids"] = valid_ids
        user_doc["cobertura_nombres"] = [self.display_name(cid) for cid in valid_ids]
        user_doc["requires_coverage_setup"] = len(valid_ids) == 0
        return user_doc


_default_catalog: Optional[GeoCatalog] = None


def get_geo_catalog() -> GeoCatalog:
    global _default_catalog
    if _default_catalog is None:
        _default_catalog = GeoCatalog.from_file()
    return _default_catalog
