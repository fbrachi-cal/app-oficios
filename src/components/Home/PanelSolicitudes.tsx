import React, { useEffect, useState } from "react";
import { FaAward, FaCompress, FaExpand, FaEllipsisV } from "react-icons/fa";
import { useUser } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import { solicitudService } from "../../services/solicitudService";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext"; // si no lo tenés ya
import ModalSolicitud from "../../components/Modal/ModalSolicitud";
import ModalCalificacion from "../../components/Modal/ModalCalifica";


const PanelSolicitudes: React.FC = () => {
    const { user } = useUser();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandido, setExpandido] = useState(false);
    const [dropdowns, setDropdowns] = useState<number | null>(null);
    const { setLoading } = useLoading();
    const [modalAccion, setModalAccion] = useState<{
        estado: string;
        titulo: string;
        mensaje: string;
        textoConfirmar?: string;
        confirmColor?: "red" | "green" | "blue" | "gray";
        mostrarMotivos?: boolean;
        mostrarObservacion?: boolean;
    } | null>(null);

    const [modalCalificarAbierta, setModalCalificarAbierta] = useState(false);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
    const [motivoSeleccionado, setMotivoSeleccionado] = useState<string | undefined>();
    const [observacion, setObservacion] = useState<string | undefined>();

    const enviarCalificacion = async (puntuacion: number, observacion: string) => {
        if (!solicitudSeleccionada) return;

        try {
            setLoading(true);
            await solicitudService.calificarUsuario({
                solicitud_id: solicitudSeleccionada.id,
                calificacion: puntuacion,
                observacion,
            });
            setModalCalificarAbierta(false);
            setSolicitudSeleccionada(null);
    
            // 🔄 Recargar las solicitudes para actualizar la lista
            const data = await solicitudService.obtenerSolicitudes();
            setSolicitudes(data);
        } catch (error) {
            console.error("Error al calificar:", error);
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        const cargarSolicitudes = async () => {
            try {
                const data = await solicitudService.obtenerSolicitudes();
                setSolicitudes(data);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            }
        };

        if (user) cargarSolicitudes();
    }, [user]);

    const cambiarEstadoSolicitud = async (id: string, nuevo_estado: string, motivo?: string,
        observacion?: string) => {
        try {
            setLoading(true);
            await solicitudService.actualizarEstado(id, nuevo_estado, motivo, observacion);
            // Vuelve a cargar las solicitudes
            const data = await solicitudService.obtenerSolicitudes();
            setSolicitudes(data);
            setModalAccion(null); // cerrar modal si no lo hace el modal mismo
        } catch (err) {
            console.error("Error al cambiar el estado:", err);
        } finally {
            setLoading(false);
        }
    };


    const toggleDropdown = (index: number) => {
        setDropdowns(dropdowns === index ? null : index);
    };

    return (
        <div className={`pt-6 px-4 text-center ${expandido ? "w-full" : "w-full md:w-4/12"} order-first relative`}>
            <div 
                className={`relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg ${!user ? "cursor-pointer hover:shadow-xl transition-all duration-300" : ""}`}
                onClick={() => {
                    if (!user) {
                        navigate('/auth/registro');
                    }
                }}
            >
                <button
                    onClick={() => setExpandido(!expandido)}
                    className="absolute top-2 right-4 text-gray-500 hover:text-gray-700 z-20 flex items-center"
                    title={expandido ? t("minimizar") : t("maximizar")}
                >
                    {expandido ? <FaCompress /> : <FaExpand />}
                </button>

                <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-red-400">
                        <FaAward className="text-white" />
                    </div>

                    {user?.tipo === "cliente" ? (
                        <>
                            <h6 className="text-xl font-semibold">{t("tus_solicitudes")}</h6>
                            <p className="mt-2 mb-4 text-blueGray-500">
                                {t("descripcion_tus_solicitudes")}
                            </p>
                        </>
                    ) : user?.tipo === "profesional" ? (
                        <>
                            <h6 className="text-xl font-semibold">{t("solicitudes_recibidas")}</h6>
                            <p className="mt-2 mb-4 text-blueGray-500">
                                {t("descripcion_solicitudes_recibidas")}
                            </p>
                        </>
                    ) : (
                        <>
                            <h6 className="text-xl font-semibold">{t("landing_customer_headline")}</h6>
                            <p className="mt-2 mb-4 text-blueGray-500">
                                {t("landing_customer_subtitle")}
                            </p>
                        </>
                    )}

                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                    {!error && solicitudes.length === 0 && user && (
                        <p className="text-blueGray-400 text-sm mt-4">{t("sin_solicitudes")}</p>
                    )}

                    {!error && solicitudes.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {solicitudes.sort((a, b) => new Date(b.fecha_cambio_estado).getTime() - new Date(a.fecha_cambio_estado).getTime())
                                .map((s, i) => {
                                    const estado = s.estado?.toLowerCase();
                                    const bgColor =
                                        estado === "confirmada"
                                            ? "bg-green-100" : estado === "aceptada" ? "bg-blue-100"
                                                : estado === "cancelada" || estado === "rechazada"
                                                    ? "bg-red-100"
                                                    : "bg-yellow-100";

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setLoading(true);
                                                navigate(`/auth/solicitudes/${s.id}`);
                                            }}
                                            className={`relative p-4 border border-blueGray-200 rounded-lg shadow-sm text-left text-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col min-w-0 break-words ${bgColor}`}
                                        >
                                            <div className="absolute top-2 right-2 z-10">
                                                <button
                                                    className="p-2 text-blueGray-600 hover:text-blueGray-900 rounded-full hover:bg-white/50 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleDropdown(i);
                                                    }}
                                                >
                                                    <FaEllipsisV />
                                                </button>

                                                {dropdowns === i && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border shadow-md rounded z-30 text-sm min-w-[160px]">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLoading(true);
                                                                navigate(`/auth/solicitudes/${s.id}`);
                                                            }}
                                                            className="block px-4 py-2 hover:bg-blueGray-100 w-full text-left"
                                                        >
                                                            {t("ver")}
                                                        </button>
                                                        {user && s.estado === "confirmada" &&
                                                            (
                                                                (user.tipo === "cliente" && !s.calificacion_cliente) ||
                                                                (user.tipo === "profesional" && !s.calificacion_profesional)
                                                            ) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSolicitudSeleccionada(s);
                                                                        setModalCalificarAbierta(true);
                                                                        setDropdowns(null);
                                                                    }}
                                                                    className="block px-4 py-2 hover:bg-blueGray-100 w-full text-left"
                                                                >
                                                                    {user.tipo === "cliente"
                                                                        ? t("calificar_profesional")
                                                                        : t("calificar_cliente")}
                                                                </button>
                                                            )}

                                                        {["aceptada"].includes(s.estado) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModalAccion({
                                                                        estado: "confirmada",
                                                                        titulo: t("confirmar_confirmacion_titulo"),
                                                                        mensaje: t("confirmar_confirmacion_mensaje"),
                                                                        textoConfirmar: t("confirmar_solicitud"),
                                                                        confirmColor: "green",
                                                                    });
                                                                    setDropdowns(null);
                                                                }}
                                                                className="block px-4 py-2 hover:bg-blueGray-100 w-full text-left text-green-600 font-semibold"
                                                            >
                                                                {t("confirmar_solicitud")}
                                                            </button>
                                                        )}

                                                        {["creada", "consulta", "aceptada"].includes(s.estado) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModalAccion({
                                                                        estado: user?.tipo === "profesional" ? "rechazada" : "cancelada",
                                                                        titulo: t("confirmar_cancelacion_titulo"),
                                                                        mensaje: t("confirmar_cancelacion_mensaje"),
                                                                        textoConfirmar:
                                                                            user?.tipo === "profesional" ? t("rechazar_solicitud") : t("cancelar_solicitud"),
                                                                        confirmColor: "red",
                                                                        mostrarMotivos: true,
                                                                        mostrarObservacion: true
                                                                    });
                                                                    setDropdowns(null);
                                                                }}
                                                                className="block px-4 py-2 hover:bg-blueGray-100 w-full text-left text-red-600 font-semibold"
                                                            >
                                                                {user?.tipo === "profesional" ? t("rechazar_solicitud") : t("cancelar_solicitud")}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pr-8 space-y-1">
                                                <p className="break-words whitespace-normal text-blueGray-700 min-w-0"><strong className="text-blueGray-800">{t("zona", "Zona")}:</strong> {s.zona}</p>
                                                <p className="break-words whitespace-normal text-blueGray-700 min-w-0"><strong className="text-blueGray-800">{t("subcategoria")}:</strong> {s.subcategoria}</p>
                                                <p className="break-words whitespace-normal text-blueGray-700 min-w-0"><strong className="text-blueGray-800">{t("descripcion")}:</strong> {s.descripcion}</p>
                                                <p className="break-words whitespace-normal text-blueGray-700 min-w-0"><strong className="text-blueGray-800">{t("estado_fijo") as string}:</strong> {s.estado ? (t(`estado.${s.estado.toLowerCase()}`, s.estado) as string) : ""}</p>
                                            </div>
                                            
                                            {s.fotos_urls?.length > 0 && (
                                                <div className="mt-3 flex gap-2 flex-wrap pb-1">
                                                    {s.fotos_urls.map((url: any, j: number) => (
                                                        <img
                                                            key={j}
                                                            src={url.thumbnail || url.original}
                                                            alt={`foto-${j}`}
                                                            className="h-16 w-16 object-cover rounded border border-blueGray-300 shadow-sm"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                )}
                        </div>
                    )}
                    {modalAccion && dropdowns !== null && (
                        <ModalSolicitud
                            isOpen={true}
                            onClose={() => {
                                setMotivoSeleccionado(undefined);
                                setObservacion(undefined);
                                setModalAccion(null);
                            }}
                            onConfirm={(motivo, obs) =>
                                cambiarEstadoSolicitud(solicitudes[dropdowns].id, modalAccion.estado, motivo, obs)
                              }
                            titulo={modalAccion.titulo}
                            mensaje={modalAccion.mensaje}
                            textoConfirmar={modalAccion.textoConfirmar}
                            confirmColor={modalAccion.confirmColor}
                            mostrarMotivos={modalAccion.mostrarMotivos}
                            mostrarObservacion={modalAccion.mostrarObservacion}                            
                        />
                    )}
                    <ModalCalificacion
                        isOpen={modalCalificarAbierta}
                        onClose={() => setModalCalificarAbierta(false)}
                        onSubmit={enviarCalificacion}
                        titulo={t("califica_al_profesional")}
                    />

                </div>
            </div>
        </div>
    );
};

export default PanelSolicitudes;
