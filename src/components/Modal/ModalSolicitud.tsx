import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { fetchConToken } from "../../utils/fetchConToken";
import config from "../../config";
import { useTranslation } from "react-i18next";

interface ModalSolicitudProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (motivo?: string, observacion?: string) => void;
  titulo?: string;
  mensaje?: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  confirmColor?: "red" | "green" | "blue" | "gray";
  children?: React.ReactNode;
  mostrarMotivos?: boolean;
  mostrarObservacion?: boolean;
  onMotivoSeleccionado?: (motivo: string) => void;
  onObservacionCambiada?: (obs: string) => void;
}

const ModalSolicitud: React.FC<ModalSolicitudProps> = ({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensaje,
  textoCancelar,
  textoConfirmar,
  confirmColor,
  children,
  mostrarMotivos = false,
  mostrarObservacion = false,  
}) => {
  const [motivos, setMotivos] = useState<{ id: string; key: string }[]>([]);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("");
  const [observacion, setObservacion] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (mostrarMotivos) {
      fetchConToken(`${config.apiBaseUrl}/utils/motivos_cancelacion`)
        .then((res) => res.json())
        .then((data) => setMotivos(data))
        .catch((err) => logger.error("Error cargando motivos:", err));
    }
  }, [mostrarMotivos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-lg font-bold"
          onClick={onClose}
        >
          ×
        </button>

        {children ? (
          children
        ) : (
          <>
            {titulo && <h2 className="text-xl font-bold mb-4">{titulo}</h2>}
            {mensaje && <p className="text-blueGray-700 mb-4">{mensaje}</p>}

            {mostrarMotivos && (
              <div className="mb-4">
                <label className="block mb-1 font-semibold">{t("motivo")}</label>
                <select
                  value={motivoSeleccionado}
                  onChange={(e) => setMotivoSeleccionado(e.target.value)}
                  className="w-full max-w-full p-3 sm:p-2 border rounded bg-white text-gray-800 break-words"
                >
                  <option value="">{t("seleccione_motivo")}</option>
                  {motivos.map((m) => (
                    <option key={m.id} value={m.key}>
                      {t(`${m.key}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mostrarObservacion && (
              <div className="mb-4">
                <label className="block mb-1 font-semibold">{t("observacion_opcional")}</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  rows={3}
                  className="w-full max-w-full p-3 sm:p-2 border rounded bg-white text-gray-800 break-words"
                  placeholder={t("escribi_observacion")}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-3 sm:py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 w-full sm:w-auto font-medium"
              >
                {textoCancelar || t("volver_atras")}
              </button>
              {onConfirm && (
                <button
                  onClick={() => {
                    onConfirm(motivoSeleccionado, observacion);
                    onClose();
                  }}
                  className={`px-4 py-3 sm:py-2 text-white rounded hover:opacity-90 w-full sm:w-auto font-medium ${confirmColor === "green"
                    ? "bg-green-600 hover:bg-green-700"
                    : confirmColor === "blue"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : confirmColor === "gray"
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  {textoConfirmar || t("confirmar")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalSolicitud;
