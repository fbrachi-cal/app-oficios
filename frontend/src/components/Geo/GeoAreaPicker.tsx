import React, { useState, useMemo } from "react";
import { FiSearch, FiChevronDown, FiChevronRight, FiCheck, FiX, FiMapPin } from "react-icons/fi";
import { useGeoCatalog, GeoArea, normalizeText } from "../../hooks/useGeoCatalog";

export type GeoPickerMode = "pro" | "client-search" | "single-leaf";

export interface GeoAreaPickerProps {
  mode: GeoPickerMode;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}

export const GeoAreaPicker: React.FC<GeoAreaPickerProps> = ({
  mode,
  selectedIds,
  onChange,
  placeholder = "Buscar barrio, localidad, comuna o partido...",
  compact = false,
}) => {
  const {
    loading,
    areasById,
    childrenByParentId,
    agrupaciones,
    getDisplayName,
    getBreadcrumb,
    normalizeProSelections,
    getCoveringAncestor,
    getDescendantClientLeaves,
  } = useGeoCatalog();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["ar-c", "ar-b"]));
  const [isDropdownOpen, setIsDropdownOpen] = useState(!compact);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle an area in Professional mode (hierarchical normalization)
  const handleToggleProArea = (area: GeoArea) => {
    if (!area.selectable_by_pro) return;
    const coveringAncestor = getCoveringAncestor(area.id, selectedSet);
    if (coveringAncestor) {
      // Already covered via parent; ignore click on disabled descendant
      return;
    }

    let next: string[];
    if (selectedSet.has(area.id)) {
      next = selectedIds.filter((id) => id !== area.id);
    } else {
      next = normalizeProSelections([...selectedIds, area.id]);
    }
    onChange(next);
  };

  // Toggle a leaf in Client Search or Single Leaf mode
  const handleToggleClientLeaf = (area: GeoArea) => {
    if (!area.selectable_by_client) return;

    if (mode === "single-leaf") {
      if (selectedSet.has(area.id)) {
        onChange([]);
      } else {
        onChange([area.id]);
        if (compact) setIsDropdownOpen(false);
      }
      return;
    }

    // client-search (multi-leaf)
    if (selectedSet.has(area.id)) {
      onChange(selectedIds.filter((id) => id !== area.id));
    } else {
      onChange([...selectedIds, area.id]);
    }
  };

  // Bulk select/deselect all leaf descendants of a parent in Client Search mode
  const handleToggleAllParentLeavesForClient = (parentId: string) => {
    const leaves = getDescendantClientLeaves(parentId);
    if (leaves.length === 0) return;
    const leafIds = leaves.map((l) => l.id);
    const allSelected = leafIds.every((id) => selectedSet.has(id));

    if (allSelected) {
      const removeSet = new Set(leafIds);
      onChange(selectedIds.filter((id) => !removeSet.has(id)));
    } else {
      const merged = [...selectedIds];
      const seen = new Set(selectedIds);
      for (const id of leafIds) {
        if (!seen.has(id)) {
          merged.push(id);
          seen.add(id);
        }
      }
      onChange(merged);
    }
  };

  const isGroupingSelected = (memberIds: string[]): boolean => {
    if (mode === "pro") {
      const validMembers = memberIds.filter((id) => areasById.get(id)?.selectable_by_pro);
      return (
        validMembers.length > 0 &&
        validMembers.every(
          (id) => selectedSet.has(id) || !!getCoveringAncestor(id, selectedSet)
        )
      );
    }
    if (mode === "client-search") {
      const allLeaves: string[] = [];
      for (const mid of memberIds) {
        for (const leaf of getDescendantClientLeaves(mid)) {
          allLeaves.push(leaf.id);
        }
      }
      return allLeaves.length > 0 && allLeaves.every((id) => selectedSet.has(id));
    }
    return false;
  };

  // Convenience grouping shortcut (Zona Norte, Zona Oeste, Zona Sur)
  const handleToggleGrouping = (memberIds: string[]) => {
    if (mode === "pro") {
      const validMembers = memberIds.filter((id) => areasById.get(id)?.selectable_by_pro);
      const allCovered = isGroupingSelected(memberIds);
      if (allCovered) {
        const removeSet = new Set(validMembers);
        onChange(selectedIds.filter((id) => !removeSet.has(id)));
      } else {
        onChange(normalizeProSelections([...selectedIds, ...validMembers]));
      }
    } else if (mode === "client-search") {
      const allLeaves: string[] = [];
      for (const mid of memberIds) {
        for (const leaf of getDescendantClientLeaves(mid)) {
          allLeaves.push(leaf.id);
        }
      }
      const allSelected = allLeaves.length > 0 && allLeaves.every((id) => selectedSet.has(id));
      if (allSelected) {
        const removeSet = new Set(allLeaves);
        onChange(selectedIds.filter((id) => !removeSet.has(id)));
      } else {
        const merged = [...selectedIds];
        const seen = new Set(selectedIds);
        for (const id of allLeaves) {
          if (!seen.has(id)) {
            merged.push(id);
            seen.add(id);
          }
        }
        onChange(merged);
      }
    }
  };

  const removeChip = (id: string) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  // Filtered search results when searchQuery is non-empty
  const filteredAreas = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return [];
    const results: GeoArea[] = [];
    for (const area of areasById.values()) {
      if (mode === "pro" && !area.selectable_by_pro) continue;
      if ((mode === "client-search" || mode === "single-leaf") && !area.selectable_by_client) continue;

      const haystack = normalizeText(
        `${area.nombre} ${area.nombre_corto || ""} ${getBreadcrumb(area.id)}`
      );
      if (haystack.includes(q)) {
        results.push(area);
      }
    }
    results.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999) || x.nombre.localeCompare(y.nombre));
    return results;
  }, [searchQuery, areasById, mode, getBreadcrumb]);

  const topRegions = useMemo(() => {
    return childrenByParentId.get("ar") || [];
  }, [childrenByParentId]);

  const renderTreeNode = (area: GeoArea, depth = 0): React.ReactNode => {
    const children = childrenByParentId.get(area.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(area.id);

    if (mode === "pro") {
      const coveringAncestor = getCoveringAncestor(area.id, selectedSet);
      const isDirectlySelected = selectedSet.has(area.id);
      const isInherited = !!coveringAncestor;
      const canSelect = area.selectable_by_pro;

      return (
        <div key={area.id} className="select-none">
          <div
            className={`flex items-center justify-between py-2 px-2.5 rounded-lg transition-colors ${
              isDirectlySelected
                ? "bg-blue-50/80 text-blue-900"
                : isInherited
                ? "bg-slate-50 text-slate-500"
                : "hover:bg-slate-50 text-slate-800"
            }`}
            style={{ paddingLeft: `${depth * 16 + 10}px` }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(area.id)}
                  className="p-1 rounded hover:bg-slate-200/60 text-slate-500 shrink-0"
                  aria-label={isExpanded ? `Contraer ${area.nombre}` : `Expandir ${area.nombre}`}
                >
                  {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}

              {canSelect ? (
                <button
                  type="button"
                  disabled={isInherited}
                  onClick={() => handleToggleProArea(area)}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                      isDirectlySelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : isInherited
                        ? "bg-blue-200 border-blue-300 text-blue-700"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    {(isDirectlySelected || isInherited) && <FiCheck size={11} />}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {area.nombre}
                    {area.nombre_corto && area.nombre_corto !== area.nombre
                      ? ` (${area.nombre_corto})`
                      : ""}
                  </span>
                  {isInherited && coveringAncestor && (
                    <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700 shrink-0">
                      Incluido en {coveringAncestor.nombre_corto || coveringAncestor.nombre}
                    </span>
                  )}
                  {isDirectlySelected && hasChildren && (
                    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white shrink-0">
                      Cubre todo
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleExpand(area.id)}
                  className="text-sm font-semibold text-slate-700 text-left flex-1 truncate"
                >
                  {area.nombre}
                </button>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="border-l border-slate-100 ml-4">
              {children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Client modes: "client-search" or "single-leaf"
    const isLeaf = area.selectable_by_client;
    const isSelected = selectedSet.has(area.id);
    const descendantLeaves = !isLeaf ? getDescendantClientLeaves(area.id) : [];
    const selectedLeafCount = descendantLeaves.filter((l) => selectedSet.has(l.id)).length;
    const allLeavesSelected =
      descendantLeaves.length > 0 && selectedLeafCount === descendantLeaves.length;

    return (
      <div key={area.id} className="select-none">
        <div
          className={`flex items-center justify-between py-2 px-2.5 rounded-lg transition-colors ${
            isSelected ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50 text-slate-800"
          }`}
          style={{ paddingLeft: `${depth * 16 + 10}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(area.id)}
                className="p-1 rounded hover:bg-slate-200/60 text-slate-500 shrink-0"
                aria-label={isExpanded ? `Contraer ${area.nombre}` : `Expandir ${area.nombre}`}
              >
                {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}

            {isLeaf ? (
              <button
                type="button"
                onClick={() => handleToggleClientLeaf(area)}
                className="flex items-center gap-2.5 text-left min-w-0 flex-1"
              >
                <span
                  className={`w-4 h-4 ${
                    mode === "single-leaf" ? "rounded-full" : "rounded"
                  } flex items-center justify-center border shrink-0 transition-colors ${
                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300"
                  }`}
                >
                  {isSelected && <FiCheck size={11} />}
                </span>
                <span className="text-sm font-medium truncate">{area.nombre}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggleExpand(area.id)}
                className="flex items-center justify-between text-left min-w-0 flex-1"
              >
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {area.nombre_corto || area.nombre}
                </span>
                {selectedLeafCount > 0 && (
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                    {selectedLeafCount}/{descendantLeaves.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {!isLeaf && mode === "client-search" && descendantLeaves.length > 0 && area.id !== "ar-b" && (
            <button
              type="button"
              onClick={() => handleToggleAllParentLeavesForClient(area.id)}
              aria-label={`${allLeavesSelected ? "Quitar todos de" : "Elegir todos de"} ${area.nombre_corto || area.nombre}`}
              className="ml-2 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 shrink-0"
            >
              {allLeavesSelected ? "Quitar todos" : "Elegir todos"}
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-100 ml-4">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Selected Chips Summary */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          {selectedIds.slice(0, 12).map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm"
            >
              <FiMapPin size={11} />
              <span>{getDisplayName(id)}</span>
              <button
                type="button"
                onClick={() => removeChip(id)}
                className="hover:bg-blue-700 rounded-full p-0.5"
                aria-label={`Quitar ${getDisplayName(id)}`}
              >
                <FiX size={12} />
              </button>
            </span>
          ))}
          {selectedIds.length > 12 && (
            <span className="text-xs font-semibold text-slate-600 px-2 py-1">
              +{selectedIds.length - 12} más
            </span>
          )}
          {selectedIds.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="ml-auto text-xs font-semibold text-slate-500 hover:text-rose-600 px-2 py-1"
            >
              Limpiar ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Compact Trigger Button (used in search bar if compact=true) */}
      {compact && (
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="input-base flex items-center justify-between text-left w-full"
        >
          <span className="truncate text-sm text-slate-700">
            {selectedIds.length === 0
              ? "Todas las zonas (seleccionar barrios/localidades)"
              : selectedIds.length === 1
              ? getDisplayName(selectedIds[0])
              : `${selectedIds.length} ubicaciones seleccionadas`}
          </span>
          <FiChevronDown
            size={16}
            className={`text-slate-400 transition-transform shrink-0 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* Main Selector Panel */}
      {isDropdownOpen && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <FiSearch
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            {/* Quick Convenience Groupings (CABA + Zona Norte/Oeste/Sur) */}
            {mode !== "single-leaf" && agrupaciones.length > 0 && !searchQuery && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">
                  Accesos rápidos:
                </span>
                {mode === "pro" && areasById.has("ar-c") && (
                  <button
                    type="button"
                    onClick={() => handleToggleProArea(areasById.get("ar-c")!)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      selectedSet.has("ar-c")
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    Toda CABA
                  </button>
                )}
                {agrupaciones.map((grp) => {
                  const active = isGroupingSelected(grp.miembros);
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleToggleGrouping(grp.miembros)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                      }`}
                    >
                      {active ? `✓ ${grp.nombre}` : `+ ${grp.nombre}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List / Tree Body */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Cargando catálogo geográfico...
              </div>
            ) : searchQuery.trim().length > 0 ? (
              filteredAreas.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  No se encontraron ubicaciones para "{searchQuery}"
                </div>
              ) : (
                filteredAreas.map((area) => {
                  const coveringAncestor =
                    mode === "pro" ? getCoveringAncestor(area.id, selectedSet) : undefined;
                  const isDirectlySelected = selectedSet.has(area.id);
                  const isInherited = !!coveringAncestor;

                  return (
                    <button
                      key={area.id}
                      type="button"
                      disabled={isInherited}
                      onClick={() =>
                        mode === "pro"
                          ? handleToggleProArea(area)
                          : handleToggleClientLeaf(area)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        isDirectlySelected
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : isInherited
                          ? "bg-slate-50 text-slate-400"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            isDirectlySelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : isInherited
                              ? "bg-blue-200 border-blue-300 text-blue-700"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {(isDirectlySelected || isInherited) && <FiCheck size={11} />}
                        </span>
                        <span className="truncate">{getBreadcrumb(area.id)}</span>
                      </div>
                      {isInherited && coveringAncestor && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0 ml-2">
                          Incluido en {coveringAncestor.nombre_corto || coveringAncestor.nombre}
                        </span>
                      )}
                    </button>
                  );
                })
              )
            ) : (
              topRegions.map((region) => renderTreeNode(region, 0))
            )}
          </div>

          {compact && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="text-xs font-semibold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeoAreaPicker;
