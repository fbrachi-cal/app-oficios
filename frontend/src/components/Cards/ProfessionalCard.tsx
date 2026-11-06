import React from "react";
import { useTranslation } from "react-i18next";
import { FiCheckCircle } from "react-icons/fi";
import { FaStar as FaStarSolid } from "react-icons/fa";
import default_avatar from "../../assets/img/default_avatar.png";

type ProfessionalCardProps = {
  profesional: {
    id: string;
    nombre: string;
    foto?: string;
    categoria?: string;
    subcategorias?: string[];
    cobertura_ids?: string[];
    cobertura_nombres?: string[];
    zonas?: string[];
    matched_location_ids?: string[];
    matched_location_names?: string[];
    matched_locations_count?: number;
    total_searched_locations?: number;
    calificacion?: number;
    trabajosRealizados?: number;
    disponibilidad?: string;
  };
  onVerPerfil?: (id: string) => void;
};

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ profesional, onVerPerfil }) => {
  const { t } = useTranslation();

  // Handle rating display
  const rating = profesional.calificacion || 0;
  const trabajos = profesional.trabajosRealizados || 0;
  const displayZonas = profesional.cobertura_nombres?.length
    ? profesional.cobertura_nombres
    : profesional.zonas || [];
  const matchedNames = profesional.matched_location_names || [];
  const matchedCount = profesional.matched_locations_count ?? matchedNames.length;
  const totalSearched = profesional.total_searched_locations ?? 0;

  return (
    <div className="card flex flex-col p-5 group cursor-pointer hover:-translate-y-1 transition-transform min-w-0 overflow-hidden" onClick={() => onVerPerfil?.(profesional.id)}>
      <div className="flex gap-4 mb-4">
        {/* Avatar */}
        <div className="shrink-0 relative">
          <img
            src={profesional.foto || default_avatar}
            alt={profesional.nombre}
            className="w-16 h-16 rounded-full object-cover border border-neutral-200"
          />
          {/* Disponibilidad badge as a small dot if needed, or we show it below */}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-1 mb-1 min-w-0">
            <h3 className="text-base font-bold text-neutral-900 truncate pr-1 group-hover:text-brand-600 transition-colors min-w-0">
              {profesional.nombre}
            </h3>
            {profesional.disponibilidad && (
              <span className="badge badge-available shrink-0 mt-0.5 truncate max-w-[40%]">
                {profesional.disponibilidad}
              </span>
            )}
          </div>
          
          <p className="text-sm text-neutral-500 truncate mb-2">
            {(profesional.subcategorias && profesional.subcategorias.length > 0) 
              ? profesional.subcategorias.join(", ") 
              : profesional.categoria || t("no_especificada")}
          </p>

          <div className="flex items-center gap-1.5 text-sm">
            <FaStarSolid className="text-warning-500" size={14} />
            <span className="font-semibold text-neutral-700">{rating.toFixed(1)}</span>
            <span className="text-neutral-400">({trabajos})</span>
          </div>
        </div>
      </div>

      {/* Matched Search Locations Badge */}
      {totalSearched > 0 && matchedCount > 0 && (
        <div
          className={`mb-3 px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-start gap-1.5 ${
            matchedCount === totalSearched
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <FiCheckCircle className="shrink-0 mt-0.5" size={13} />
          <div className="min-w-0">
            <span className="font-bold">
              Cubre {matchedCount}/{totalSearched}{" "}
              {totalSearched === 1 ? "ubicaciones" : "buscadas"}:
            </span>{" "}
            <span className="break-words">{matchedNames.join(", ")}</span>
          </div>
        </div>
      )}

      {/* Zonas Chips */}
      {displayZonas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {displayZonas.slice(0, 2).map((zona, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-100 text-neutral-600 text-xs font-medium">
              {zona}
            </span>
          ))}
          {displayZonas.length > 2 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-50 border border-neutral-200 text-neutral-500 text-xs font-medium">
              +{displayZonas.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto pt-4 border-t border-neutral-100">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevenir doble navegación si hace click en el botón
            onVerPerfil?.(profesional.id);
          }}
          className="w-full btn-secondary py-2.5 shadow-sm border border-neutral-200 bg-white hover:bg-neutral-50 group-hover:border-neutral-300 transition-all"
        >
          {t("ver_perfil")}
        </button>
      </div>
    </div>
  );
};

export default ProfessionalCard;
