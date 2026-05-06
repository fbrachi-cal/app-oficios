import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import config from "../config";
import { fetchConToken } from "../utils/fetchConToken";
import { logger } from "../utils/logger";

interface Categoria {
  id: string;
  nombre: string;
  subcategorias: { nombre: string; orden: number }[];
}

interface BuscadorContextProps {
  zonasDisponibles: string[];
  categorias: Categoria[];
  subcategoriasDisponibles: { nombre: string; orden: number }[];
  zonas: string[];
  setZonas: (zonas: string[]) => void;
  categoriaSeleccionada: string;
  setCategoriaSeleccionada: (cat: string) => void;
  subcategoriasSeleccionadas: string[];
  setSubcategoriasSeleccionadas: (subcats: string[]) => void;
  resultados: any[];
  loading: boolean;
  tieneMas: boolean;
  haBuscado: boolean;
  buscar: (reset?: boolean) => Promise<void>;
  resetFilters: () => void;
}

const BuscadorContext = createContext<BuscadorContextProps | undefined>(undefined);

export const BuscadorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Filtros seleccionados
  const [zonas, setZonas] = useState<string[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<string[]>([]);

  // Estado de resultados
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit] = useState(12);
  const [ultimoId, setUltimoId] = useState<string | null>(null);
  const [tieneMas, setTieneMas] = useState(false);
  const [haBuscado, setHaBuscado] = useState(false);

  // Carga inicial de utilidades (zonas y categorías)
  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles)
      .catch((err) => logger.error("Error al cargar zonas", err));

    fetchConToken(`${config.apiBaseUrl}/utils/categorias`)
      .then((res) => res.json())
      .then(setCategorias)
      .catch((err) => logger.error("Error al cargar categorías", err));
  }, []);

  // Actualizar subcategorías disponibles cuando cambia la categoría
  const subcategoriasDisponibles =
    categorias.find((c) => c.nombre === categoriaSeleccionada)?.subcategorias || [];

  useEffect(() => {
    // Resetear subcategorías al cambiar de categoría
    setSubcategoriasSeleccionadas([]);
  }, [categoriaSeleccionada]);

  const buscar = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const body = {
          zonas,
          categoria: categoriaSeleccionada,
          subcategorias: subcategoriasSeleccionadas,
          limit,
          ...(ultimoId && !reset ? { start_after_id: ultimoId } : {}),
        };

        const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/profesionales/buscar`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setHaBuscado(true);

        if (reset) {
          setResultados(data);
        } else {
          setResultados((prev) => [...prev, ...data]);
        }

        setTieneMas(data.length === limit);
        if (data.length > 0) {
          setUltimoId(data[data.length - 1].id);
        }
      } catch (error) {
        logger.error("🔍 Error buscando profesionales", error);
      } finally {
        setLoading(false);
      }
    },
    [zonas, categoriaSeleccionada, subcategoriasSeleccionadas, limit, ultimoId]
  );

  const resetFilters = useCallback(() => {
    setZonas([]);
    setCategoriaSeleccionada("");
    setSubcategoriasSeleccionadas([]);
    setResultados([]);
    setTieneMas(false);
    setUltimoId(null);
    setHaBuscado(false);
  }, []);

  return (
    <BuscadorContext.Provider
      value={{
        zonasDisponibles,
        categorias,
        subcategoriasDisponibles,
        zonas,
        setZonas,
        categoriaSeleccionada,
        setCategoriaSeleccionada,
        subcategoriasSeleccionadas,
        setSubcategoriasSeleccionadas,
        resultados,
        loading,
        tieneMas,
        haBuscado,
        buscar,
        resetFilters,
      }}
    >
      {children}
    </BuscadorContext.Provider>
  );
};

export const useBuscadorContext = () => {
  const context = useContext(BuscadorContext);
  if (!context) {
    throw new Error("useBuscadorContext must be used within a BuscadorProvider");
  }
  return context;
};
