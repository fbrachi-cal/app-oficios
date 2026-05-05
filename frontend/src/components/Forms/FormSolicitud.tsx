import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiMapPin, FiBriefcase, FiFileText, FiCamera, FiX } from "react-icons/fi";

type FormSolicitudProps = {
  zonasDisponibles: string[];
  subcategoriasDisponibles: string[];
  onSubmit: (data: {
    zona: string;
    subcategoria: string;
    descripcion: string;
    fotos: File[] | null;
  }) => void;
  onCancel: () => void;
};

const FormSolicitud: React.FC<FormSolicitudProps> = ({
  zonasDisponibles,
  subcategoriasDisponibles,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [zona, setZona] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ zona, subcategoria, descripcion, fotos });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      <div>
        <label className="input-label flex items-center gap-1.5">
          <FiMapPin size={14} /> {t("zona_trabajo")}
        </label>
        <select
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          className="input-base"
          required
        >
          <option value="">{t("selecciona_zona")}</option>
          {zonasDisponibles.map((z) => (
            <option key={z} value={z}>{z}</option>
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

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary w-full sm:w-1/3 py-3"
        >
          {t("cancelar")}
        </button>
        <button
          type="submit"
          className="btn-primary w-full sm:w-2/3 py-3"
        >
          {t("enviar_solicitud")}
        </button>
      </div>
    </form>
  );
};

export default FormSolicitud;
