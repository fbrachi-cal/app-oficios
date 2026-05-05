import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiMapPin, FiBriefcase, FiPaperclip, FiSend, FiStar, FiAlertCircle, FiX } from "react-icons/fi";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useLoading } from "../../context/LoadingContext";
import { solicitudService } from "../../services/solicitudService";
import { useUser } from "../../context/UserContext";
import { logger } from "../../utils/logger";
import default_avatar from "../../assets/img/default_avatar.png";
import ModalSolicitud from "../../components/Modal/ModalSolicitud";
import ModalCalificacion from "../../components/Modal/ModalCalifica";

const DetalleSolicitud: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { setLoading } = useLoading();

  const [solicitud, setSolicitud] = useState<any>(null);
  const [otroUsuario, setOtroUsuario] = useState<any>(null);
  const [observacion, setObservacion] = useState("");
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);
  const archivoInputRef = useRef<HTMLInputElement>(null);

  const [modalAccion, setModalAccion] = useState<any>(null);
  const [modalCalificarAbierta, setModalCalificarAbierta] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    cargarSolicitud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const cargarSolicitud = async () => {
    try {
      setLoading(true);
      const data = await solicitudService.obtenerSolicitudPorId(id!);
      setSolicitud(data);

      const esCliente = user?.tipo === "cliente";
      const otroId = esCliente ? data.profesional_id : data.solicitante_id;

      const userRes = await fetchConToken(`${config.apiBaseUrl}/usuarios/${otroId}`);
      const userData = await userRes.json();
      setOtroUsuario(userData);
    } catch (err) {
      logger.error("Error al cargar detalles", err);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (nuevo_estado: string, motivo?: string, obs?: string) => {
    try {
      setLoading(true);
      await solicitudService.actualizarEstado(id!, nuevo_estado, motivo, obs);
      await cargarSolicitud();
      setModalAccion(null);
    } catch (err) {
      logger.error("Error cambiar estado", err);
    } finally {
      setLoading(false);
    }
  };

  const enviarConsulta = async () => {
    if (!observacion.trim() && archivosAdjuntos.length === 0) return;
    try {
      setLoading(true);
      const urls = await Promise.all(
        archivosAdjuntos.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file);
          const response = await fetch(`${config.apiBaseUrl}/upload`, { method: "POST", body: formData });
          const data = await response.json();
          return data[0].url;
        })
      );

      await solicitudService.enviarConsulta(id!, { mensaje: observacion, fotos: urls });
      setObservacion("");
      setArchivosAdjuntos([]);
      if (archivoInputRef.current) archivoInputRef.current.value = "";
      await cargarSolicitud();
    } catch (e) {
      logger.error("Error enviar consulta", e);
    } finally {
      setLoading(false);
    }
  };

  const enviarCalificacion = async (puntuacion: number, obs: string) => {
    try {
      setLoading(true);
      await solicitudService.calificarUsuario({
        solicitud_id: solicitud.id,
        calificacion: puntuacion,
        observacion: obs,
      });
      setModalCalificarAbierta(false);
      navigate("/actividad");
    } catch (error) {
      logger.error("Error calificar", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    const lower = estado?.toLowerCase();
    switch (lower) {
      case "confirmada": return <span className="badge badge-confirmed text-sm px-3 py-1">{t(`estado.${lower}`)}</span>;
      case "aceptada": return <span className="badge badge-accepted text-sm px-3 py-1">{t(`estado.${lower}`)}</span>;
      case "cancelada":
      case "rechazada": return <span className="badge badge-cancelled text-sm px-3 py-1">{t(`estado.${lower}`)}</span>;
      default: return <span className="badge badge-pending text-sm px-3 py-1">{t(`estado.${lower}`)}</span>;
    }
  };

  if (!solicitud || !otroUsuario) return null;

  const esConfirmada = solicitud.estado === "confirmada";
  const faltaCalificar = esConfirmada && ((user?.tipo === "cliente" && !solicitud.calificacion_cliente) || (user?.tipo === "profesional" && !solicitud.calificacion_profesional));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
      
      {/* Header compact */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-700"
        >
          <FiChevronLeft size={24} />
        </button>
        <h1 className="text-base font-bold text-slate-900 truncate px-4">
          Detalle del pedido
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
        
        {/* State Banner */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Estado actual</div>
            <div className="flex items-center gap-2">
              {getStatusBadge(solicitud.estado)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Actualizado</div>
            <div className="text-sm font-semibold text-slate-900">
              {new Date(solicitud.fecha_cambio_estado).toLocaleDateString("es-AR")}
            </div>
          </div>
        </div>

        {/* Counterpart Card */}
        <div className="card p-5 flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => navigate(`/profesional/${otroUsuario.id}`)}>
          <img
            src={otroUsuario.foto || default_avatar}
            alt={otroUsuario.nombre}
            className="w-14 h-14 rounded-full object-cover border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{otroUsuario.nombre}</h3>
            <p className="text-sm text-slate-500">{user?.tipo === "cliente" ? "Profesional" : "Cliente"}</p>
          </div>
          <FiChevronLeft size={20} className="text-slate-400 rotate-180" />
        </div>

        {/* Job Details */}
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiMapPin /> Zona</div>
              <div className="text-sm font-medium text-slate-900">{solicitud.zona}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1 mb-1"><FiBriefcase /> Servicio</div>
              <div className="text-sm font-medium text-slate-900">{solicitud.subcategoria}</div>
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase mb-2">Descripción</div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {solicitud.descripcion}
            </p>
          </div>
          
          {solicitud.fotos?.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase mb-2">Imágenes adjuntas</div>
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {solicitud.fotos.map((f: any, i: number) => (
                  <img
                    key={i}
                    src={f.thumbnail || f.original || f}
                    alt="adjunto"
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200 shrink-0 snap-start cursor-pointer"
                    onClick={() => setImagenSeleccionada(f.original || f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Info */}
          {["cancelada", "rechazada"].includes(solicitud.estado) && solicitud.motivo_cancelacion && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mt-4">
              <div className="text-sm font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                <FiAlertCircle /> Motivo de cancelación
              </div>
              <p className="text-sm text-rose-700 font-medium">{t(solicitud.motivo_cancelacion)}</p>
              {solicitud.observacion_cancelacion && (
                <p className="text-sm text-rose-600/80 italic mt-1">"{solicitud.observacion_cancelacion}"</p>
              )}
            </div>
          )}
        </div>

        {/* Rating Nudge / Form */}
        {faltaCalificar && (
          <div className="card p-6 bg-amber-50 border-amber-200 text-center">
            <FiStar className="text-amber-500 mx-auto mb-3" size={32} />
            <h3 className="text-lg font-bold text-amber-900 mb-2">¡Calificá el trabajo!</h3>
            <p className="text-sm text-amber-700 mb-4">
              Ayudá a la comunidad contando tu experiencia con {otroUsuario.nombre}.
            </p>
            <button onClick={() => setModalCalificarAbierta(true)} className="btn-primary w-full bg-amber-500 hover:bg-amber-600 border-none">
              Calificar ahora
            </button>
          </div>
        )}

        {/* Conversation Thread */}
        {solicitud.historial_consultas?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 ml-1">Conversación</h3>
            <div className="space-y-4">
              {solicitud.historial_consultas
                .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                .map((msg: any, i: number) => {
                  const isAdmin = msg.tipo === "admin" || String(msg.autor_id).includes("admin");
                  const isMe = !isAdmin && msg.usuario_id === user?.id;
                  
                  if (isAdmin) {
                    return (
                      <div key={i} className="flex justify-center my-4">
                        <div className="bg-slate-800 text-slate-200 text-xs px-4 py-2 rounded-full font-medium max-w-[80%] text-center shadow-sm">
                          {msg.mensaje}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                        <div className={`text-xs font-semibold mb-1 ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                          {isMe ? 'Vos' : otroUsuario.nombre}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.mensaje}</p>
                        {msg.fotos?.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto">
                            {msg.fotos.map((f: string, idx: number) => (
                              <img key={idx} src={f} alt="adjunto" className="w-16 h-16 rounded-lg object-cover cursor-pointer shrink-0" onClick={() => setImagenSeleccionada(f)} />
                            ))}
                          </div>
                        )}
                        <div className={`text-[10px] mt-2 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.fecha).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* Input box for active states */}
        {((user?.tipo === "profesional" && ["creada", "consulta"].includes(solicitud.estado)) ||
          (user?.tipo === "cliente" && solicitud.estado === "consulta")) && (
          <div className="card p-3 flex items-end gap-2 bg-white sticky bottom-24 shadow-lg ring-1 ring-slate-200">
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all p-2 flex flex-col">
              {archivosAdjuntos.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {archivosAdjuntos.map((file, idx) => (
                    <div key={idx} className="relative shrink-0 mt-2 mr-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => setArchivosAdjuntos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5 hover:bg-slate-900 shadow-sm"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                className="w-full bg-transparent border-none text-sm resize-none focus:outline-none p-1 max-h-32 min-h-[40px]"
                rows={1}
                placeholder="Escribí un mensaje..."
                value={observacion}
                onChange={(e) => {
                  setObservacion(e.target.value);
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <label className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors p-1">
                  <FiPaperclip size={18} />
                  <input type="file" multiple accept="image/*" ref={archivoInputRef} onChange={(e) => setArchivosAdjuntos((prev) => [...prev, ...Array.from(e.target.files || [])])} className="hidden" />
                </label>
              </div>
            </div>
            <button onClick={enviarConsulta} disabled={!observacion.trim() && archivosAdjuntos.length === 0} className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 transition-colors">
              <FiSend size={18} className="mr-0.5 mt-0.5" />
            </button>
          </div>
        )}

      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-40" style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}>
        <div className="container mx-auto max-w-2xl flex gap-3">
          
          {/* Client Actions */}
          {user?.tipo === "cliente" && ["creada", "consulta", "aceptada"].includes(solicitud.estado) && (
            <>
              <button
                onClick={() => setModalAccion({ estado: "cancelada", titulo: t("confirmar_cancelacion_titulo"), mensaje: t("confirmar_cancelacion_mensaje"), textoConfirmar: t("cancelar_solicitud"), confirmColor: "red", mostrarMotivos: true, mostrarObservacion: true })}
                className="btn-secondary flex-1 py-3.5 text-rose-600 hover:bg-rose-50"
              >
                Cancelar
              </button>
              {solicitud.estado === "aceptada" && (
                <button
                  onClick={() => setModalAccion({ estado: "confirmada", titulo: t("confirmar_confirmacion_titulo"), mensaje: t("confirmar_confirmacion_mensaje"), textoConfirmar: t("confirmar_solicitud"), confirmColor: "green" })}
                  className="btn-primary flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 border-none shadow-md"
                >
                  Confirmar trabajo
                </button>
              )}
            </>
          )}

          {/* Professional Actions */}
          {user?.tipo === "profesional" && ["creada", "consulta"].includes(solicitud.estado) && (
            <>
              <button
                onClick={() => setModalAccion({ estado: "cancelada", titulo: t("confirmar_cancelacion_titulo"), mensaje: t("confirmar_cancelacion_mensaje"), textoConfirmar: t("cancelar_solicitud"), confirmColor: "red", mostrarMotivos: true, mostrarObservacion: true })}
                className="btn-secondary flex-1 py-3.5 text-rose-600 hover:bg-rose-50"
              >
                Rechazar
              </button>
              <button
                onClick={() => setModalAccion({ estado: "aceptada", titulo: t("confirmar_aceptacion_titulo"), mensaje: t("confirmar_aceptacion_mensaje"), textoConfirmar: t("aceptar_solicitud"), confirmColor: "green" })}
                className="btn-primary flex-1 py-3.5 shadow-md"
              >
                Aceptar pedido
              </button>
            </>
          )}

          {/* Fallback space if no actions to avoid layout jump */}
          {!((user?.tipo === "cliente" && ["creada", "consulta", "aceptada"].includes(solicitud.estado)) || (user?.tipo === "profesional" && ["creada", "consulta"].includes(solicitud.estado))) && (
            <div className="w-full text-center text-sm font-medium text-slate-400 py-3.5">
              No hay acciones disponibles
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {imagenSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setImagenSeleccionada(null)}>
          <div className="max-w-4xl max-h-[90vh] p-4 relative" onClick={e => e.stopPropagation()}>
            <img src={imagenSeleccionada} alt="Zoom" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            <button onClick={() => setImagenSeleccionada(null)} className="absolute top-0 right-0 p-3 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full m-4 transition-colors">
              <FiChevronLeft size={24} className="rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalAccion && (
        <ModalSolicitud
          isOpen={true}
          onClose={() => setModalAccion(null)}
          onConfirm={(m, o) => cambiarEstado(modalAccion.estado, m, o)}
          {...modalAccion}
        />
      )}

      <ModalCalificacion
        isOpen={modalCalificarAbierta}
        onClose={() => setModalCalificarAbierta(false)}
        onSubmit={enviarCalificacion}
        titulo={user?.tipo === "cliente" ? "Calificá al profesional" : "Calificá al cliente"}
      />
    </div>
  );
};

export default DetalleSolicitud;
