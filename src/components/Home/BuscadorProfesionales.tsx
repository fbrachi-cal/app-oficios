import React, { useEffect, useState } from "react";
import { FaSearch, FaExpand, FaCompress } from "react-icons/fa";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useTranslation } from "react-i18next";

const BuscadorProfesionales: React.FC = () => {
  const { t } = useTranslation();

  const [zonas, setZonas] = useState<string[]>([]);
  const [oficios, setOficios] = useState<string[]>([]);
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles);

    fetch(`${config.apiBaseUrl}/utils/oficios`)
      .then((res) => res.json())
      .then(setOficiosDisponibles);
  }, []);

  const buscarProfesionales = async () => {
    console.log("BUSCAR PROF");
    try {
      const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/profesionales/buscar`, {
        method: "POST",
        body: JSON.stringify({ zonas, oficios }),
      });
  
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
  
      const data = await res.json();
      setResultados(data);
    } catch (error) {
      console.error("🔍 Error buscando profesionales:", error);
    }
  };

  return (
    <div className={`pt-6 px-4 text-center ${expandido ? "w-full" : "w-full md:w-4/12"} order-first relative`}>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg">
        
        {/* Botón expandir/minimizar a la derecha */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="absolute top-2 right-4 text-gray-500 hover:text-gray-700 z-20 flex items-center"
        title={expandido ? t("minimizar") : t("maximizar")}
        style={{ position: "absolute", right: "1rem", top: "0.5rem" }}
        >
          {expandido ? <FaCompress /> : <FaExpand />}
        </button>

        <div className="px-4 py-5 flex-auto">
          {/* Ícono principal */}
          <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-lightBlue-400">
            <FaSearch className="text-white" />
          </div>

          <h6 className="text-xl font-semibold">{t("buscar_profesionales")}</h6>
          <p className="mt-2 mb-4 text-blueGray-500">{t("elige_zonas_y_oficios")}</p>

          {/* Zonas */}
          <select
            multiple
            className="w-full mb-3 p-2 border rounded"
            value={zonas}
            onChange={(e) =>
              setZonas(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
          >
            {zonasDisponibles.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          {/* Oficios */}
          <select
            multiple
            className="w-full mb-3 p-2 border rounded"
            value={oficios}
            onChange={(e) =>
              setOficios(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
          >
            {oficiosDisponibles.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {/* Botón buscar */}
          <button
            onClick={buscarProfesionales}
            className="mt-2 bg-blueGray-800 text-white text-xs font-bold uppercase px-6 py-2 rounded shadow hover:shadow-md"
          >
            {t("buscar")}
          </button>

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="mt-4 text-left">
              <h6 className="font-bold text-sm mb-2">{t("resultados")}:</h6>
              <ul className="text-sm list-disc ml-6">
                {resultados.map((prof) => (
                  <li key={prof.id}>
                    {prof.nombre} ({prof.oficios?.join(", ")})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuscadorProfesionales;
