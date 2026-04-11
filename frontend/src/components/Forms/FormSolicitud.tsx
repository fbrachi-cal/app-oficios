import React, { useState } from "react";
import { useTranslation } from "react-i18next";

type FormSolicitudProps = {
    zonasDisponibles: string[];
    subcategoriasDisponibles: string[];
    onSubmit: (data: {
      zona: string;
      subcategoria: string;      
      descripcion: string;
      fotos: FileList | null;
    }) => void;
    onCancel: () => void;
  };

const FormSolicitud: React.FC<FormSolicitudProps> = ({ zonasDisponibles,
    subcategoriasDisponibles,
    onSubmit,
    onCancel, }) => {
  const { t } = useTranslation();
  const [zona, setZona] = useState("");
  const [subcategoria, setSubcategoria] = useState("");  
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<FileList | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ zona, subcategoria, descripcion, fotos });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
          {t("zona_trabajo")}
        </label>
        <select
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          className="w-full px-3 py-2 bg-blueGray-100 rounded"
          required
        >
          <option value="">{t("selecciona_zona")}</option>
          {zonasDisponibles.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
          {t("subcategoria")}
        </label>
        <select
          value={subcategoria}
          onChange={(e) => setSubcategoria(e.target.value)}
          className="w-full px-3 py-2 bg-blueGray-100 rounded"
          required
        >
          <option value="">{t("selecciona_oficio")}</option>
          {subcategoriasDisponibles.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
          {t("descripcion_trabajo")}
        </label>
        <textarea
          rows={4}
          placeholder={t("contanos_que_necesitas")}
          className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-blueGray-100 rounded text-sm shadow focus:outline-none focus:ring w-full max-w-full ease-linear transition-all duration-150 break-words"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        ></textarea>
      </div>

      <div>
        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
          {t("fotos_opcional")}
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFotos(e.target.files)}
          className="block w-full max-w-full text-sm text-blueGray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lightBlue-50 file:text-lightBlue-700 hover:file:bg-lightBlue-100 break-words whitespace-normal"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-blueGray-600 border border-blueGray-300 px-4 py-3 sm:py-2 rounded shadow text-sm hover:bg-blueGray-100 w-full sm:w-auto font-medium"
        >
          {t("cancelar")}
        </button>
        <button
          type="submit"
          className="bg-lightBlue-500 text-white px-4 py-3 sm:py-2 rounded shadow hover:shadow-md text-sm w-full sm:w-auto font-medium"
        >
          {t("enviar_solicitud")}
        </button>
      </div>
    </form>
  );
};

export default FormSolicitud;
