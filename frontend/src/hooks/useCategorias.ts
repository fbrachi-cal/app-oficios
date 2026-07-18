import { useState, useEffect } from "react";
import config from "../config";
import { logger } from "../utils/logger";

export interface Subcategoria {
  nombre: string;
  orden: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  subcategorias: Subcategoria[];
  orden: number;
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${config.apiBaseUrl}/utils/categorias`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch categories");
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setCategorias(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        logger.error("Error loading categories:", err);
        if (active) {
          setError(err.message || "Error loading categories");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { categorias, loading, error };
}
