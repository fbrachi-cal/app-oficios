import { logger } from "../../utils/logger";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function CardSolicitud() {
  const { t } = useTranslation();
  const [zona, setZona] = useState("");
  const [horarios, setHorarios] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<FileList | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar los datos al backend
    logger.info({ zona, horarios, descripcion, fotos });
  };

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0">
            <h6 className="text-blueGray-700 text-xl font-bold">
              {t("crear_solicitud_servicio")}
            </h6>
            <button
              className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-4 py-3 sm:py-2 rounded shadow hover:shadow-md outline-none focus:outline-none w-full sm:w-auto sm:mr-1 ease-linear transition-all duration-150"
              type="button"
            >
              {t("guardar")}
            </button>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit}>
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              {t("detalles_trabajo")}
            </h6>

            <div className="flex flex-wrap">
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("zona")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("ej_zona")}
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  />
                </div>
              </div>

              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("horarios_disponibles")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("ej_horarios")}
                    value={horarios}
                    onChange={(e) => setHorarios(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />

            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              {t("descripcion_trabajo")}
            </h6>

            <div className="flex flex-wrap">
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("descripcion")}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={t("ej_descripcion")}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full max-w-full ease-linear transition-all duration-150 break-words"
                  ></textarea>
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />

            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
              {t("fotos_opcional")}
            </h6>

            <div className="flex flex-wrap">
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFotos(e.target.files)}
                    className="block w-full max-w-full text-sm text-blueGray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lightBlue-50 file:text-lightBlue-700 hover:file:bg-lightBlue-100 break-words whitespace-normal"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-right px-4">
              <button
                type="submit"
                className="bg-lightBlue-500 text-white active:bg-lightBlue-600 font-bold uppercase text-xs px-6 py-3 sm:py-2 rounded shadow hover:shadow-md ease-linear transition-all duration-150 w-full sm:w-auto"
              >
                {t("enviar_solicitud")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
