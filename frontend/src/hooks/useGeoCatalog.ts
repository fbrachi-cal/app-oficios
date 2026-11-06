import { useState, useEffect, useMemo, useCallback } from "react";
import config from "../config";
import { logger } from "../utils/logger";

export interface GeoArea {
  id: string;
  nombre: string;
  nombre_corto?: string;
  tipo: string;
  parent_id: string | null;
  ancestors: string[];
  selectable_by_pro: boolean;
  selectable_by_client: boolean;
  activo: boolean;
  orden: number;
}

export interface GeoGrouping {
  id: string;
  nombre: string;
  region_id?: string;
  miembros: string[];
}

export interface GeoCatalogData {
  version: string;
  areas: GeoArea[];
  agrupaciones: GeoGrouping[];
}

export interface ClientLeafOption {
  id: string;
  nombre: string;
  tipo: string;
  parent_id: string | null;
  parent_nombre: string | null;
}

const STORAGE_KEY = "casaclick_geo_catalog_cache_v1";

let inMemoryCatalog: GeoCatalogData | null = null;
let inFlightPromise: Promise<GeoCatalogData> | null = null;

export function resetGeoCatalogCacheForTests() {
  inMemoryCatalog = null;
  inFlightPromise = null;
}

async function fetchCatalogFromApi(): Promise<GeoCatalogData> {
  if (inMemoryCatalog) return inMemoryCatalog;
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/geo/catalog`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.areas)) {
        inMemoryCatalog = data as GeoCatalogData;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Ignore storage quota errors
        }
        return inMemoryCatalog;
      }
      throw new Error("Formato de catálogo geográfico inválido");
    } catch (err) {
      logger.error("Error cargando catálogo geográfico", err);
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.areas)) {
            inMemoryCatalog = parsed;
            return parsed as GeoCatalogData;
          }
        }
      } catch {
        // Ignore parse error
      }
      return { version: "0.0.0", areas: [], agrupaciones: [] };
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function useGeoCatalog() {
  const [catalog, setCatalog] = useState<GeoCatalogData | null>(inMemoryCatalog);
  const [loading, setLoading] = useState<boolean>(!inMemoryCatalog);

  useEffect(() => {
    let mounted = true;
    if (inMemoryCatalog) {
      setCatalog(inMemoryCatalog);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCatalogFromApi().then((data) => {
      if (mounted) {
        setCatalog(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const areasById = useMemo(() => {
    const map = new Map<string, GeoArea>();
    if (!catalog?.areas) return map;
    for (const a of catalog.areas) {
      if (a.activo) {
        map.set(a.id, a);
      }
    }
    return map;
  }, [catalog]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, GeoArea[]>();
    for (const a of areasById.values()) {
      const pid = a.parent_id || "__root__";
      const list = map.get(pid) || [];
      list.push(a);
      map.set(pid, list);
    }
    for (const list of map.values()) {
      list.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999) || x.nombre.localeCompare(y.nombre));
    }
    return map;
  }, [areasById]);

  const getArea = useCallback(
    (id: string): GeoArea | undefined => areasById.get(id),
    [areasById]
  );

  const getDisplayName = useCallback(
    (id: string): string => {
      const a = areasById.get(id);
      return a ? a.nombre_corto || a.nombre : id;
    },
    [areasById]
  );

  const getFullName = useCallback(
    (id: string): string => {
      const a = areasById.get(id);
      return a ? a.nombre : id;
    },
    [areasById]
  );

  const getBreadcrumb = useCallback(
    (id: string): string => {
      const a = areasById.get(id);
      if (!a) return id;
      const parts: string[] = [];
      for (const ancId of a.ancestors) {
        if (ancId === "ar") continue;
        const anc = areasById.get(ancId);
        if (anc) parts.push(anc.nombre_corto || anc.nombre);
      }
      return parts.length > 0 ? `${a.nombre} (${parts.join(" › ")})` : a.nombre;
    },
    [areasById]
  );

  /**
   * Normalizes professional coverage selections: deduplicates and removes any
   * area whose ancestor is also in the selection set.
   */
  const normalizeProSelections = useCallback(
    (selectedIds: string[]): string[] => {
      const validIds = new Set<string>();
      for (const id of selectedIds) {
        const a = areasById.get(id);
        if (a && a.selectable_by_pro) {
          validIds.add(a.id);
        }
      }
      const collapsed: GeoArea[] = [];
      for (const id of validIds) {
        const a = areasById.get(id)!;
        const coveredByAncestor = a.ancestors.some((anc) => validIds.has(anc));
        if (!coveredByAncestor) {
          collapsed.push(a);
        }
      }
      collapsed.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999) || x.id.localeCompare(y.id));
      return collapsed.map((a) => a.id);
    },
    [areasById]
  );

  /**
   * Checks whether `areaId` is inherited from an explicitly selected ancestor
   * in `selectedIds`. Returns the covering ancestor GeoArea if so.
   */
  const getCoveringAncestor = useCallback(
    (areaId: string, selectedIds: Set<string>): GeoArea | undefined => {
      const area = areasById.get(areaId);
      if (!area) return undefined;
      for (const ancId of area.ancestors) {
        if (selectedIds.has(ancId)) {
          return areasById.get(ancId);
        }
      }
      return undefined;
    },
    [areasById]
  );

  /**
   * Returns all client-selectable leaf areas under `parentId` (or inside `parentId`'s subtree).
   */
  const getDescendantClientLeaves = useCallback(
    (parentId: string): GeoArea[] => {
      const leaves: GeoArea[] = [];
      for (const a of areasById.values()) {
        if (a.selectable_by_client && (a.id === parentId || a.ancestors.includes(parentId))) {
          leaves.push(a);
        }
      }
      leaves.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999) || x.nombre.localeCompare(y.nombre));
      return leaves;
    },
    [areasById]
  );

  /**
   * Expands a professional's `cobertura_ids` into concrete client-selectable leaf options
   * for use in `FormSolicitud`.
   */
  const expandProCoverageToClientLeaves = useCallback(
    (proCoverageIds: string[]): ClientLeafOption[] => {
      const proSet = new Set(proCoverageIds || []);
      if (proSet.size === 0) return [];
      const leaves: GeoArea[] = [];
      for (const a of areasById.values()) {
        if (!a.selectable_by_client) continue;
        if (proSet.has(a.id) || a.ancestors.some((anc) => proSet.has(anc))) {
          leaves.push(a);
        }
      }
      leaves.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999) || x.nombre.localeCompare(y.nombre));
      return leaves.map((a) => {
        const parent = a.parent_id ? areasById.get(a.parent_id) : undefined;
        return {
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          parent_id: a.parent_id,
          parent_nombre: parent ? parent.nombre_corto || parent.nombre : null,
        };
      });
    },
    [areasById]
  );

  return {
    catalog,
    loading,
    areasById,
    childrenByParentId,
    agrupaciones: catalog?.agrupaciones || [],
    getArea,
    getDisplayName,
    getFullName,
    getBreadcrumb,
    normalizeProSelections,
    getCoveringAncestor,
    getDescendantClientLeaves,
    expandProCoverageToClientLeaves,
  };
}
