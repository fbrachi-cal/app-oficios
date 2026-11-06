import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FiMapPin, FiBriefcase, FiFileText, FiCamera, FiX, FiSearch } from "react-icons/fi";
import { useGeoCatalog, normalizeText } from "../../hooks/useGeoCatalog";

type FormSolicitudProps = {
  coberturaIds?: string[];
  zonasDisponibles?: string[];
  subcategoriasDisponibles: string[];
  onSubmit: (data: {
    zona: string;
    zona_id: string;
    subcategoria: string;
    descripcion: string;
    fotos: File[] | null;
  }) => void;
  onCancel: () => void;
};

const FormSolicitud: React.FC<FormSolicitudProps> = ({
  coberturaIds = [],
  zonasDisponibles = [],
  subcategoriasDisponibles,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { expandProCoverageToClientLeaves } = useGeoCatalog();
  const [zonaId, setZonaId] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);

  const coveredLeafOptions = useMemo(() => {
    if (coberturaIds && coberturaIds.length > 0) {
      return expandProCoverageToClientLeaves(coberturaIds);
    }
    return zonasDisponibles.map((z) => ({
      id: z,
      nombre: z,
      tipo: "barrio",
      parent_id: null,
      parent_nombre: null,
    }));
  }, [coberturaIds, zonasDisponibles, expandProCoverageToClientLeaves]);

  const filteredLeafOptions = useMemo(() => {
    const q = normalizeText(zonaFiltro);
    if (!q) return coveredLeafOptions;
    return coveredLeafOptions.filter((opt) =>
      normalizeText(`${opt.nombre} ${opt.parent_nombre || ""}`).includes(q)
    );
  }, [coveredLeafOptions, zonaFiltro]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ zona: zonaId, zona_id: zonaId, subcategoria, descripcion, fotos });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      <div>
        <label className="input-label flex items-center gap-1.5">
          <FiMapPin size={14} /> {t("zona_trabajo")}
        </label>
        {coveredLeafOptions.length > 8 && (
          <div className="relative mb-2">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={zonaFiltro}
              onChange={(e) => setZonaFiltro(e.target.value)}
              placeholder="Filtrar barrio o localidad cubierta..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
        <select
          value={zonaId}
          onChange={(e) => setZonaId(e.target.value)}
          className="input-base"
          required
        >
          <option value="">{t("selecciona_zona")}</option>
          {filteredLeafOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.parent_nombre ? `${opt.nombre} (${opt.parent_nombre})` : opt.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label flex items-center gap-1.5">
          <FiBriefcase size={14} /> {t("subcategoria")}
        </label>
        <select
          value={subcategoria}
          onChange={(e) => setSubcategoria(e.target.value)}
          className="input-base"
          required
        >
          <option value="">{t("selecciona_oficio")}</option>
          {subcategoriasDisponibles.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label flex items-center gap-1.5">
          <FiFileText size={14} /> {t("descripcion_trabajo")}
        </label>
        <textarea
          rows={4}
          placeholder={t("contanos_que_necesitas")}
          className="input-base resize-none py-3 leading-relaxed"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        ></textarea>
        <p className="text-xs text-slate-400 mt-1.5">Tratá de ser lo más específico posible para que el profesional te entienda mejor.</p>
      </div>

      <div>
        <label className="input-label flex items-center gap-1.5 mb-2">
          <FiCamera size={14} /> {t("fotos_opcional")}
        </label>
        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFotos((prev) => [...prev, ...Array.from(e.target.files || [])])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-1">
            <FiCamera size={24} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Subir imágenes</span>
            <span className="text-xs text-slate-400">Podés seleccionar varias</span>
          </div>
        </div>
        {fotos.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {fotos.map((file, idx) => (
                <div key={idx} className="relative shrink-0 mt-2 mr-2">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFotos(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5 hover:bg-slate-900 shadow-sm"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary w-1/3 py-3"
        >
          {t("cancelar")}
        </button>
        <button
          type="submit"
          className="btn-primary w-2/3 py-3"
        >
          {t("enviar_solicitud")}
        </button>
      </div>
    </form>
  );
};

export default FormSolicitud;
