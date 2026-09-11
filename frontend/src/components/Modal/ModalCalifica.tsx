import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export interface FormCalificacionProps {
  titulo?: string;
  nombreTarget?: string;
  onSubmit: (calificacion: number, observacion: string) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  submitButtonText?: string;
  className?: string;
}

export const FormCalificacion: React.FC<FormCalificacionProps> = ({
  titulo,
  nombreTarget,
  onSubmit,
  onCancel,
  showCancelButton = false,
  submitButtonText,
  className = "",
}) => {
  const { t } = useTranslation();
  const [calificacion, setCalificacion] = useState(0);
  const [observacion, setObservacion] = useState("");

  return (
    <div className={`space-y-4 text-center ${className}`}>
      {titulo && <h2 className="text-xl font-bold text-slate-900 mb-1">{titulo}</h2>}
      {nombreTarget && (
        <p className="text-sm text-slate-600 mb-4">
          ¿Cómo fue tu experiencia con <span className="font-semibold text-slate-900">{nombreTarget}</span>?
        </p>
      )}

      <div className="flex gap-2 justify-center py-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCalificacion(n)}
            className={`text-3xl sm:text-4xl transition-transform hover:scale-110 ${
              calificacion >= n ? "text-yellow-400" : "text-gray-300"
            }`}
            title={`${n} estrella${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        placeholder={t("observacion_opcional", "Opinión u observación sobre el trabajo (opcional)")}
        className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        rows={3}
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
      />

      <div className="flex justify-end gap-3 pt-2">
        {showCancelButton && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            {t("cancelar", "Cancelar")}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSubmit(calificacion, observacion)}
          disabled={calificacion === 0}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 border-none text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
        >
          {submitButtonText || t("calificar", "Calificar")}
        </button>
      </div>
    </div>
  );
};

export interface ModalCalificacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (calificacion: number, observacion: string) => void;
  titulo: string;
  nombreTarget?: string;
}

const ModalCalificacion: React.FC<ModalCalificacionProps> = ({
  isOpen,
  onClose,
  onSubmit,
  titulo,
  nombreTarget,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[90dvh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
          onClick={onClose}
        >
          ×
        </button>

        <FormCalificacion
          titulo={titulo}
          nombreTarget={nombreTarget}
          onSubmit={(calificacion, observacion) => {
            onSubmit(calificacion, observacion);
            onClose();
          }}
          onCancel={onClose}
          showCancelButton={true}
        />
      </div>
    </div>
  );
};

export default ModalCalificacion;
