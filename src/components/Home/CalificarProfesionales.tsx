import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { FaSearch, FaExpand, FaCompress } from "react-icons/fa";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useTranslation } from "react-i18next";
import ProfessionalCard from "../Cards/ProfessionalCard";
import { useNavigate } from 'react-router-dom';

const CalificarProfesionales: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [zonas, setZonas] = useState<string[]>([]);
    const [oficios, setOficios] = useState<string[]>([]);
    const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
    const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);
    const [resultados, setResultados] = useState<any[]>([]);
    const [expandido, setExpandido] = useState(false);
    const [limit] = useState(6); // cantidad por página
    const [ultimoId, setUltimoId] = useState<string | null>(null);
    const [tieneMas, setTieneMas] = useState(false);

    useEffect(() => {
        fetch(`${config.apiBaseUrl}/utils/zonas`)
            .then((res) => res.json())
            .then(setZonasDisponibles);

        fetch(`${config.apiBaseUrl}/utils/oficios`)
            .then((res) => res.json())
            .then(setOficiosDisponibles);
    }, []);

    const buscarProfesionales = async (reset = true) => {
        try {
            const body = {
                zonas,
                oficios,
                limit,
                ...(ultimoId && !reset ? { start_after_id: ultimoId } : {}),
            };

            const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/profesionales/buscar`, {
                method: "POST",
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            if (reset) {
                setResultados(data);
            } else {
                setResultados((prev) => [...prev, ...data]);
            }

            setTieneMas(data.length === limit);
            if (data.length > 0) {
                setUltimoId(data[data.length - 1].id);
            }
        } catch (error) {
            logger.error("🔍 Error buscando profesionales", error);
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
                >
                    {expandido ? <FaCompress /> : <FaExpand />}
                </button>

                <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-lightBlue-400">
                        <FaSearch className="text-white" />
                    </div>

                    <h6 className="text-xl font-semibold">{t("buscar_profesionales")}</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">{t("elige_zonas_y_oficios")}</p>

                    <select
                        multiple
                        className="w-full mb-3 p-2 border rounded"
                        value={zonas}
                        onChange={(e) =>
                            setZonas(Array.from(e.target.selectedOptions, (opt) => opt.value))
                        }
                    >
                        {zonasDisponibles.map((z) => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                    </select>

                    <select
                        multiple
                        className="w-full mb-3 p-2 border rounded"
                        value={oficios}
                        onChange={(e) =>
                            setOficios(Array.from(e.target.selectedOptions, (opt) => opt.value))
                        }
                    >
                        {oficiosDisponibles.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => buscarProfesionales(true)}
                        className="mt-2 bg-blueGray-800 text-white text-xs font-bold uppercase px-6 py-2 rounded shadow hover:shadow-md"
                    >
                        {t("buscar")}
                    </button>

                    {resultados.length > 0 && (
                        <div className="mt-6">
                            <div className="grid gap-4">
                                {resultados.map((prof) => (
                                    <ProfessionalCard
                                        key={prof.id}
                                        profesional={prof}
                                        onVerPerfil={(id) => {
                                            logger.info("Ir al perfil", { id });
                                            navigate(`/auth/profesionales/${id}`);
                                        }}
                                    />
                                ))}
                            </div>

                            {tieneMas && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => buscarProfesionales(false)}
                                        className="bg-lightBlue-500 text-white px-4 py-2 rounded shadow hover:shadow-md text-sm font-bold"
                                    >
                                        {t("ver_mas")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalificarProfesionales;
