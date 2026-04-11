import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { FaSearch, FaExpand, FaCompress } from "react-icons/fa";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useTranslation } from "react-i18next";
import ProfessionalCard from "../Cards/ProfessionalCard";
import { useNavigate } from 'react-router-dom';

const BuscadorProfesionales: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [zonas, setZonas] = useState<string[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<string[]>([]);
    const [subcategoriasDisponibles, setSubcategoriasDisponibles] = useState<{ nombre: string, orden: number }[]>([]);
    const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
    const [resultados, setResultados] = useState<any[]>([]);
    const [expandido, setExpandido] = useState(false);
    const [limit] = useState(6); // cantidad por página
    const [ultimoId, setUltimoId] = useState<string | null>(null);
    const [tieneMas, setTieneMas] = useState(false);

    useEffect(() => {
        fetch(`${config.apiBaseUrl}/utils/zonas`)
            .then((res) => res.json())
            .then(setZonasDisponibles);

        fetchConToken(`${config.apiBaseUrl}/utils/categorias`)
            .then((res) => res.json())
            .then((data) => setCategorias(data));
    }, []);

    useEffect(() => {
        const categoria = categorias.find((c) => c.nombre === categoriaSeleccionada);
        setSubcategoriasDisponibles(categoria?.subcategorias || []);
        setSubcategoriasSeleccionadas([]);
    }, [categoriaSeleccionada, categorias]);

    const buscarProfesionales = async (reset = true) => {
        try {
            logger.info("BUSCAR PROFESIONALES CAT SELECCIONADA: "+categoriaSeleccionada);
            const body = {
                zonas,
                categoria: categoriaSeleccionada,
                subcategorias: subcategoriasSeleccionadas,
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
            logger.error("🔍 Error buscando profesionales:", error);
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

                    <h6 className="text-xl font-semibold">{t('landing_customer_headline')}</h6>
                    <p className="mt-2 mb-4 text-blueGray-500">{t("elige_zonas_y_categoria")}</p>

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
                        className="w-full mb-3 p-2 border rounded"
                        value={categoriaSeleccionada}
                        onChange={(e) => {
                            setCategoriaSeleccionada(e.target.value);
                        }}
                    >
                        <option value="">{t("elegir_categoria")}</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.nombre}>{t(`categorias.${c.nombre}`)}</option>
                        ))}
                    </select>

                    {categoriaSeleccionada && (
                        <select
                            multiple
                            className="w-full mb-3 p-2 border rounded"
                            value={subcategoriasSeleccionadas}
                            onChange={e =>
                                setSubcategoriasSeleccionadas(Array.from(e.target.selectedOptions, o => o.value))
                            }
                        >
                            {subcategoriasDisponibles.map(sc => (<option key={sc.nombre} value={sc.nombre}>
                                {t(`categorias.${sc.nombre}`)}</option>))}
                        </select>
                    )}

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
                                            logger.info("Ir al perfil de:", id);
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
                    {resultados.length === 0 && ultimoId === null && (
                        <div className="mt-6 text-blueGray-400 text-sm">
                            {t("sin_resultados")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuscadorProfesionales;
