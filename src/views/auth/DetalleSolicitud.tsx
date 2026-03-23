import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbars/AuthNavbar";
import { fetchConToken } from "../../utils/fetchConToken";
import { useTranslation } from "react-i18next";
import default_avatar from "../../assets/img/default_avatar.png";
import { solicitudService } from "../../services/solicitudService";
import config from "../../config";
import { useUser } from "../../context/UserContext";
import { useLoading } from "../../context/LoadingContext";
import ModalSolicitud from "../../components/Modal/ModalSolicitud";
import ModalCalificacion from "../../components/Modal/ModalCalifica";
import { useNavigate } from "react-router-dom";


const DetalleSolicitud: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [solicitud, setSolicitud] = useState<any>(null);
    const [otroUsuario, setOtroUsuario] = useState<any>(null);
    const [observacion, setObservacion] = useState("");
    const { setLoading } = useLoading();
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
    const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);
    const archivoInputRef = useRef<HTMLInputElement>(null);
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
    const [motivoSeleccionado, setMotivoSeleccionado] = useState<string | undefined>();
    const [observacionCancelacion, setObservacionCancelacion] = useState<string | undefined>();


    const enviarCalificacion = async (puntuacion: number, observacion: string) => {
        try {
            setLoading(true);
            await solicitudService.calificarUsuario({
                solicitud_id: solicitud.id,
                calificacion: puntuacion,
                observacion,
            });
            setModalCalificarAbierta(false); // cerrar la modal
            setMensaje("✅ " + t("estado_actualizado"));
            navigate("/landing"); // redirigir
        } catch (error) {
            console.error("Error al calificar:", error);
            setMensaje("❌ " + t("error_calificar"));
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        cargarSolicitud();
    }, [id, user]);

    const cambiarEstadoSolicitud = async (
        nuevo_estado: string,
        motivo?: string,
        observacion?: string
    ) => {
        try {
            setLoading(true);
            await solicitudService.actualizarEstado(id!, nuevo_estado, motivo, observacion);
            await cargarSolicitud();
            setMensaje("✅ " + t("estado_actualizado"));
        } catch (err) {
            console.error("Error al cambiar estado", err);
            setMensaje("❌ " + t("error_cambiar_estado"));
        } finally {
            setLoading(false);
            setTimeout(() => setMensaje(null), 3000);
        }
    };

    const cargarSolicitud = async () => {
        try {
            const data = await solicitudService.obtenerSolicitudPorId(id!);
            setSolicitud(data);

            const esCliente = user?.tipo === "cliente";
            const otroId = esCliente ? data.profesional_id : data.solicitante_id;

            const userRes = await fetchConToken(`${config.apiBaseUrl}/usuarios/${otroId}`);
            const userData = await userRes.json();
            setOtroUsuario(userData);
        } catch (err) {
            console.error("Error al cargar detalles de solicitud", err);
        } finally {
            setLoading(false); // ← este es el que apaga el loading
        }
    };

    const enviarConsulta = async () => {
        try {
            setLoading(true);

            const urls = await Promise.all(
                archivosAdjuntos.map(async (file) => {
                    const formData = new FormData();

                    formData.append("files", file);

                    const response = await fetch(`${config.apiBaseUrl}/upload`, {
                        method: "POST",
                        body: formData,
                    });

                    const data = await response.json();
                    return data[0].url; // Suponiendo que la respuesta es [{ filename, url }]
                })
            );

            await solicitudService.enviarConsulta(id!, {
                mensaje: observacion,
                fotos: urls,
            });

            setMensaje("✅ " + t("consulta_enviada_exito"));
            setObservacion("");
            setArchivosAdjuntos([]);
            if (archivoInputRef.current) {
                archivoInputRef.current.value = ""; // limpia el input visualmente
            }
            await cargarSolicitud();
        } catch (e) {
            console.error("Error al enviar consulta", e);
            setMensaje("❌ " + t("error_enviar_consulta"));
        } finally {
            setLoading(false);
            setTimeout(() => setMensaje(null), 3000);
        }
    };

    if (!solicitud || !otroUsuario)
        return <div className="text-center p-10">{t("cargando")}</div>;

    return (
        <>
            <Navbar transparent />
            <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow hover:bg-blue-100 transition"
                title="Volver">
                <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {mensaje && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow z-[9999]">
                    {mensaje}
                </div>
            )}
            <main className="profile-page">
                <section className="relative py-16 bg-blueGray-200 min-h-screen">
                    <div className="container mx-auto px-4">
                        <div className="bg-white shadow-xl rounded-lg p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-bold text-blueGray-800 break-words">
                                    {t("solicitud_de_trabajo")}
                                </h2>
                                <span
                                    className={`self-start sm:self-auto px-3 py-1 sm:px-4 rounded text-sm font-semibold inline-flex items-center gap-2 ${solicitud.estado === "cancelada"
                                        ? "bg-red-200 text-red-800"
                                        : solicitud.estado === "aceptada"
                                            ? "bg-green-200 text-green-800"
                                            : "bg-yellow-200 text-yellow-800"
                                        }`}
                                >
                                    {t(`estado.${solicitud.estado}`)}
                                    {solicitud.fecha_cambio_estado && (
                                        <span className="text-xs text-blueGray-600 font-normal whitespace-nowrap">
                                            ({new Date(solicitud.fecha_cambio_estado).toLocaleDateString("es-AR")})
                                        </span>
                                    )}
                                </span>

                            </div>

                            <div className="flex items-center mb-6">
                                <img
                                    src={otroUsuario.foto || default_avatar}
                                    alt="Usuario"
                                    className="w-16 h-16 rounded-full border mr-4"
                                />
                                <div>
                                    <p className="text-lg font-semibold text-blueGray-700">
                                        {otroUsuario.nombre}
                                    </p>
                                    <p className="text-sm text-blueGray-400">
                                        {user?.tipo === "cliente" ? t("profesional") : t("cliente")}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center text-blueGray-600 gap-3 sm:gap-6 min-w-0">
                                    <div className="flex items-start sm:items-center min-w-0">
                                        <i className="fas fa-map-marker-alt mt-1 sm:mt-0 mr-2 text-blueGray-400 shrink-0"></i>
                                        <span className="font-semibold mr-1 shrink-0">{t("zona")}:</span>
                                        <span className="break-words min-w-0">{solicitud.zona}</span>
                                    </div>
                                    <div className="flex items-start sm:items-center min-w-0">
                                        <i className="fas fa-tools mt-1 sm:mt-0 mr-2 text-blueGray-400 shrink-0"></i>
                                        <span className="font-semibold mr-1 shrink-0">{t("tipo_de_pedido")}:</span>
                                        <span className="break-words min-w-0">{solicitud.subcategoria}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 min-w-0">
                                <h2 className="text-xl font-semibold text-blueGray-700 mb-2 mt-4 sm:mt-0">
                                    {t("detalle_del_pedido")}
                                </h2>
                                <p className="text-blueGray-600 leading-relaxed whitespace-normal break-words min-w-0">
                                    {solicitud.descripcion || t("sin_descripcion")}
                                </p>
                            </div>
                            {["cancelada", "rechazada"].includes(solicitud.estado) && (
                                <div className="mb-6 min-w-0">
                                    <h4 className="text-lg font-semibold text-red-700 mb-2">
                                        {t("motivo_cancelacion")}
                                    </h4>
                                    {solicitud.motivo_cancelacion && (
                                        <p className="text-red-600 mb-1 break-words">{t(solicitud.motivo_cancelacion)}</p>
                                    )}
                                    {solicitud.observacion_cancelacion && (
                                        <p className="text-blueGray-600 italic break-words whitespace-normal">
                                            “{solicitud.observacion_cancelacion}”
                                        </p>
                                    )}
                                </div>
                            )}

                            {solicitud.fotos?.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-blueGray-700 mb-2">
                                        {t("fotos_adjuntas")}
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {solicitud.fotos.map((url: any, index: number) => (
                                            <img
                                                key={index}
                                                src={url.thumbnail || url.original || url}
                                                alt={`foto-${index}`}
                                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75"
                                                onClick={() => setImagenSeleccionada(url.original || url)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {solicitud.historial_consultas?.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-lg font-semibold mb-2">{t("historial_consultas")}</h4>
                                    <div className="space-y-4">
                                        {solicitud.historial_consultas
                                            .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                            .map((consulta: any, index: number) => (
                                                <div key={index} className="p-3 border rounded bg-blueGray-50 text-left">
                                                    <div className="flex items-center mb-2">
                                                        <img
                                                            src={
                                                                consulta.usuario_id === otroUsuario.id
                                                                    ? otroUsuario.foto || default_avatar
                                                                    : user?.foto || default_avatar
                                                            }
                                                            alt="avatar"
                                                            className="w-8 h-8 rounded-full mr-3"
                                                        />
                                                        <span className="font-semibold">
                                                            {consulta.usuario_id === otroUsuario.id
                                                                ? otroUsuario.nombre
                                                                : user?.nombre || t("vos")}
                                                        </span>
                                                        <span className="ml-auto text-xs text-blueGray-400">
                                                            {new Date(consulta.fecha).toLocaleString("es-AR")}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-blueGray-600 whitespace-pre-wrap break-words min-w-0">{consulta.mensaje}</p>
                                                    {consulta.fotos?.length > 0 && (
                                                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                                            {consulta.fotos.map((fotoUrl: string, idx: number) => (
                                                                <img
                                                                    key={idx}
                                                                    src={fotoUrl}
                                                                    onClick={() => setImagenSeleccionada(fotoUrl)}
                                                                    className="w-full h-24 object-cover rounded cursor-pointer border hover:opacity-75 transition"
                                                                    alt={`foto-consulta-${idx}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                            {((user?.tipo === "profesional" && ["creada", "consulta"].includes(solicitud.estado)) ||
                                (user?.tipo === "cliente" && solicitud.estado === "consulta")) && (
                                    <div className="mt-6">
                                        <h4 className="text-lg font-semibold mb-2">{t("enviar_consulta")}</h4>
                                        <textarea
                                            className="w-full max-w-full p-3 sm:p-2 border rounded mb-4 break-words"
                                            rows={3}
                                            placeholder={t("escriba_un_mensaje")}
                                            value={observacion}
                                            onChange={(e) => setObservacion(e.target.value)}
                                        />
                                        <input
                                            type="file"
                                            multiple
                                            accept="*/*"
                                            ref={archivoInputRef}
                                            onChange={(e) => setArchivosAdjuntos(Array.from(e.target.files || []))}
                                            className="block mb-4 w-full max-w-full break-words whitespace-normal text-sm"
                                        />
                                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                            <button
                                                onClick={enviarConsulta}
                                                className="bg-blue-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-blue-600 w-full sm:w-auto font-medium"
                                            >
                                                {t("enviar_consulta")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            {user?.tipo === "cliente" && ["creada", "consulta", "aceptada"].includes(solicitud.estado) && (
                                <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
                                    {solicitud.estado === "aceptada" && (
                                        <button
                                            onClick={() =>
                                                setModalAccion({
                                                    estado: "confirmada",
                                                    titulo: t("confirmar_confirmacion_titulo"),
                                                    mensaje: t("confirmar_confirmacion_mensaje"),
                                                    textoConfirmar: t("confirmar_solicitud"),
                                                    confirmColor: "green",
                                                })
                                            }
                                            className="bg-green-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-green-600 w-full sm:w-auto font-medium">
                                            {t("confirmar_solicitud")}
                                        </button>
                                    )}

                                    <button
                                        onClick={() =>
                                            setModalAccion({
                                                estado: "cancelada",
                                                titulo: t("confirmar_cancelacion_titulo"),
                                                mensaje: t("confirmar_cancelacion_mensaje"),
                                                textoConfirmar: t("cancelar_solicitud"),
                                                confirmColor: "red",
                                                mostrarMotivos: true,
                                                mostrarObservacion: true,
                                            })
                                        }
                                        className="bg-red-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-red-600 w-full sm:w-auto font-medium"
                                    >
                                        {t("cancelar_solicitud")}
                                    </button>
                                </div>
                            )}
                            {user?.tipo === "profesional" && ["creada", "consulta"].includes(solicitud.estado) && (
                                <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
                                    <button
                                        onClick={() =>
                                            setModalAccion({
                                                estado: "aceptada",
                                                titulo: t("confirmar_aceptacion_titulo"),
                                                mensaje: t("confirmar_aceptacion_mensaje"),
                                                textoConfirmar: t("aceptar_solicitud"),
                                                confirmColor: "green",
                                            })
                                        }
                                        className="bg-green-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-green-600 w-full sm:w-auto font-medium"
                                    >
                                        {t("aceptar_solicitud")}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setModalAccion({
                                                estado: "cancelada",
                                                titulo: t("confirmar_cancelacion_titulo"),
                                                mensaje: t("confirmar_cancelacion_mensaje"),
                                                textoConfirmar: t("cancelar_solicitud"),
                                                confirmColor: "red",
                                                mostrarMotivos: true,
                                                mostrarObservacion: true,
                                            })
                                        }
                                        className="bg-red-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-red-600 w-full sm:w-auto font-medium"
                                    >
                                        {t("rechazar_solicitud")}
                                    </button>
                                </div>
                            )}
                            {solicitud.estado === "confirmada" &&
                                (
                                    (user?.tipo === "cliente" && !solicitud.calificacion_cliente) ||
                                    (user?.tipo === "profesional" && !solicitud.calificacion_profesional)
                                ) && (
                                    <div className="mt-6 flex flex-col sm:block">
                                        <button
                                            onClick={() => setModalCalificarAbierta(true)}
                                            className="bg-yellow-500 text-white px-4 py-3 sm:py-2 rounded hover:bg-yellow-600 w-full sm:w-auto font-medium"
                                        >
                                            {t("calificar_profesional")}
                                        </button>
                                    </div>
                                )}
                            <div className="flex flex-col sm:flex-row gap-3 items-center mt-6 w-full">
                                {/* Bloque profesional o cliente aquí */}
                                {/* ... */}

                                <div className="sm:ml-auto w-full sm:w-auto">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="bg-gray-300 text-gray-800 px-4 py-3 sm:py-2 rounded hover:bg-gray-400 w-full sm:w-auto font-medium"
                                    >
                                        {t("volver")}
                                    </button>
                                </div>
                            </div>




                        </div>
                    </div>


                    {imagenSeleccionada && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]" onClick={() => setImagenSeleccionada(null)}>
                            <div className="bg-white p-2 rounded shadow-lg max-w-[90vw] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                                <img src={imagenSeleccionada} alt="ampliada" className="max-w-full max-h-[80vh] mx-auto" />
                                <button
                                    onClick={() => setImagenSeleccionada(null)}
                                    className="mt-2 block mx-auto bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                                >
                                    {t("cerrar")}
                                </button>
                            </div>
                        </div>
                    )}
                    {modalAccion && (
                        <ModalSolicitud
                            isOpen={!!modalAccion}
                            onClose={() => {
                                setMotivoSeleccionado(undefined);
                                setObservacionCancelacion(undefined);
                                setModalAccion(null);
                            }}
                            onConfirm={(motivo, obs) =>
                                cambiarEstadoSolicitud(modalAccion.estado, motivo, obs)
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
                </section>
            </main>
        </>
    );
};

export default DetalleSolicitud;
