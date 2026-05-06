import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiMapPin, FiX } from "react-icons/fi";
import { useBuscador } from "../hooks/useBuscador";
import ProfessionalCard from "../components/Cards/ProfessionalCard";
import { logger } from "../utils/logger";

const BuscarView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const buscador = useBuscador();


  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
          {t("buscar_profesionales")}
        </h1>
        <p className="text-sm text-neutral-500">
          {t("elige_zonas_y_categoria")}
        </p>
      </div>

      {/* Filters Form */}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-neutral-200/60 p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Zona Filter */}
          <div className="relative">
            <label className="input-label flex items-center gap-1.5">
              <FiMapPin size={14} /> Zona
            </label>
            <select
              className="input-base"
              value={buscador.zonas[0] || ""}
              onChange={(e) => buscador.setZonas(e.target.value ? [e.target.value] : [])}
            >
              <option value="">Todas las zonas</option>
              {buscador.zonasDisponibles.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Categoría Filter */}
          <div className="relative">
            <label className="input-label flex items-center gap-1.5">
              <FiSearch size={14} /> Servicio
            </label>
            <select
              className="input-base"
              value={buscador.categoriaSeleccionada}
              onChange={(e) => buscador.setCategoriaSeleccionada(e.target.value)}
            >
              <option value="">{t("elegir_categoria")}</option>
              {buscador.categorias.map((c) => (
                <option key={c.id} value={c.nombre}>{t(`categorias.${c.nombre}`)}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría Filter (if category selected) */}
          {buscador.categoriaSeleccionada && (
            <div className="relative">
              <label className="input-label flex items-center gap-1.5">Especialidad</label>
              <select
                className="input-base"
                value={buscador.subcategoriasSeleccionadas[0] || ""}
                onChange={(e) => buscador.setSubcategoriasSeleccionadas(e.target.value ? [e.target.value] : [])}
              >
                <option value="">Cualquiera</option>
                {buscador.subcategoriasDisponibles.map((sc) => (
                  <option key={sc.nombre} value={sc.nombre}>{t(`categorias.${sc.nombre}`)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Button */}
          <div className="flex items-end gap-2 lg:col-start-4">
            <button
              onClick={() => buscador.buscar(true)}
              disabled={buscador.loading}
              className="btn-primary w-full h-[46px]"
            >
              {buscador.loading ? t("cargando") : t("buscar")}
            </button>
            {(buscador.zonas.length > 0 || buscador.categoriaSeleccionada) && (
              <button
                onClick={buscador.resetFilters}
                className="btn-secondary h-[46px] px-3 shrink-0 text-neutral-400 hover:text-neutral-600"
                title="Limpiar filtros"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Results Grid */}
      {buscador.loading && !buscador.haBuscado ? (
        <div className="py-20 text-center text-neutral-500 font-medium">
          {t("cargando")}
        </div>
      ) : buscador.haBuscado && buscador.resultados.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 mb-4">
            <FiSearch size={28} />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No encontramos profesionales</h3>
          <p className="text-neutral-500">
            {t("sin_resultados")}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm font-semibold text-neutral-500">
            {buscador.resultados.length} profesionales encontrados
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {buscador.resultados.map((prof) => (
              <ProfessionalCard
                key={prof.id}
                profesional={prof}
                onVerPerfil={(id) => {
                  logger.info("Ir al perfil", { id });
                  navigate(`/profesional/${id}`);
                }}
              />
            ))}
          </div>
          
          {/* Load More */}
          {buscador.tieneMas && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => buscador.buscar(false)}
                disabled={buscador.loading}
                className="btn-secondary px-8"
              >
                {buscador.loading ? t("cargando") : t("ver_mas")}
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default BuscarView;
