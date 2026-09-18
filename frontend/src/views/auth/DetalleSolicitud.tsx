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
import ModalCalificacion, { FormCalificacion } from "../../components/Modal/ModalCalifica";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { getStatusBadge } from "../../utils/requestStatus";

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

  const [modalCalificarAbierta, setModalCalificarAbierta] = useState(false);
  const [modalVerificacionNoAbierta, setModalVerificacionNoAbierta] = useState(false);
  const [motivoNoSeleccionado, setMotivoNoSeleccionado] = useState("");
  const [enviandoVerificacion, setEnviandoVerificacion] = useState(false);
  const enviandoVerificacionRef = useRef(false);


  const lastSignatureRef = useRef<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const fetchInProgress = useRef<boolean>(false);
  const pendingReloadRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<any>(null);

  const getSignature = (data: any) => {
    if (!data) return "";
    const consultas = data.historial_consultas || [];
    const lastMsg = consultas[consultas.length - 1];
    const lastMsgSig = lastMsg ? `${lastMsg.usuario_id || lastMsg.autor_id || ''}_${lastMsg.mensaje || ''}` : "none";
    return `${data.estado || ""}_${consultas.length}_${lastMsgSig}`;
  };

  const cargarSolicitud = async (force: boolean = false) => {
    if (fetchInProgress.current && !force) {
      pendingReloadRef.current = true;
      return;
    }

    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    if (!force && timeSinceLastLoad < 1500) {
      pendingReloadRef.current = true;
      if (!cooldownTimerRef.current) {
        const delay = 1500 - timeSinceLastLoad;
        cooldownTimerRef.current = setTimeout(() => {
          cooldownTimerRef.current = null;
          if (pendingReloadRef.current) {
            pendingReloadRef.current = false;
            void cargarSolicitud();
          }
        }, delay);
      }
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoading(true);
      const data = await solicitudService.obtenerSolicitudPorId(id!);
      setSolicitud(data);

      const esCliente = user?.id ? data.solicitante_id === user.id : user?.tipo === "cliente";
      const otroId = esCliente ? data.profesional_id : data.solicitante_id;

      const userRes = await fetchConToken(`${config.apiBaseUrl}/usuarios/${otroId}`);
      const userData = await userRes.json();
      setOtroUsuario(userData);

      lastSignatureRef.current = getSignature(data);
      lastLoadTimeRef.current = Date.now();
    } catch (err) {
      logger.error("Error al cargar detalles", err);
    } finally {
      fetchInProgress.current = false;
      setLoading(false);
      
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        void cargarSolicitud();
      }
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    cargarSolicitud(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { requestId, related_entity_id } = customEvent.detail;
      const targetId = requestId || related_entity_id;
      if (targetId === id) {
        logger.info("Auto-refreshing request details from foreground notification", { requestId: targetId });
        void cargarSolicitud(true);
      }
    };
    window.addEventListener("casaclick:notification-received", handleNotification);
    return () => {
      window.removeEventListener("casaclick:notification-received", handleNotification);
    };
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;

    logger.info("Setting up Firestore onSnapshot listener for request", { id });
    const docRef = doc(db, "solicitudes", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const signature = getSignature(data);
        if (lastSignatureRef.current === null) {
          // Initial snapshot: set signature ref to avoid unnecessary API call on mount
          lastSignatureRef.current = signature;
        } else if (lastSignatureRef.current !== signature) {
          logger.info("Realtime Firestore update detected changes, refetching request via API", { id, signature, lastSignature: lastSignatureRef.current });
          void cargarSolicitud(true);
        }
      }
    }, (err) => {
      logger.error("Error in Firestore onSnapshot listener for request", err);
    });

    return () => {
      logger.info("Cleaning up Firestore onSnapshot listener for request", { id });
      unsubscribe();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [id, user]);


  const responderVerificacion = async (respuesta: "si" | "no", motivo?: string) => {
    if (enviandoVerificacionRef.current) {
      logger.info("Guard: responderVerificacion call ignored as submission is already in flight");
      return;
    }
    enviandoVerificacionRef.current = true;
    setEnviandoVerificacion(true);

    try {
      setLoading(true);
      const res = await solicitudService.responderVerificacion(id!, respuesta, motivo);
      const isClient = user?.id ? solicitud?.solicitante_id === user.id : user?.tipo === "cliente";

      if (res?.solicitud) {
        setSolicitud((prev: any) => ({
          ...prev,
          ...res.solicitud,
          mostrar_prompt_verificacion: false,
          ...(respuesta === "si"
            ? isClient
              ? { confirmo_realizacion_cliente: true }
              : { confirmo_realizacion_profesional: true }
            : {}),
        }));
      } else {
        setSolicitud((prev: any) => ({
          ...prev,
          mostrar_prompt_verificacion: false,
          ...(respuesta === "si"
            ? isClient
              ? { confirmo_realizacion_cliente: true }
              : { confirmo_realizacion_profesional: true }
            : {}),
        }));
      }

      setModalVerificacionNoAbierta(false);
      if (respuesta === "si") {
        setModalCalificarAbierta(true);
      }
      await cargarSolicitud(true);
    } catch (err) {
      logger.error("Error al responder verificación", err);
    } finally {
      setLoading(false);
      setEnviandoVerificacion(false);
      enviandoVerificacionRef.current = false;
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


  if (!solicitud || !otroUsuario) return null;



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-16 md:pb-24">
      
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
              {getStatusBadge(solicitud, t, "text-sm px-3 py-1")}
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

        {/* Verification Prompt Card */}
        {(() => {
          const isClient = user?.id ? solicitud.solicitante_id === user.id : user?.tipo === "cliente";
          const hasConfirmedCompletion = isClient
            ? (solicitud.confirmo_realizacion_cliente || solicitud.verificado_por === solicitud.solicitante_id)
            : (solicitud.confirmo_realizacion_profesional || solicitud.verificado_por === solicitud.profesional_id);
          const hasUserRated = isClient ? solicitud.califico_cliente : solicitud.califico_profesional;
          const showPrompt = solicitud.estado !== "cancelada" && solicitud.mostrar_prompt_verificacion && !hasConfirmedCompletion && !hasUserRated;

          if (!showPrompt) return null;

          return (
            <div className="card p-6 bg-blue-50 border-blue-200 text-center space-y-4">
              <FiAlertCircle className="text-blue-600 mx-auto" size={32} />
              <h3 className="text-lg font-bold text-blue-900">
                {t("pregunta_verificacion_titulo", "¿Se realizó el trabajo?")}
              </h3>
              <p className="text-sm text-blue-700">
                {t("pregunta_verificacion_mensaje", "Por favor, confirmá si el servicio contratado fue completado correctamente.")}
              </p>
              <div className="flex gap-3 max-w-xs mx-auto">
                <button
                  type="button"
                  disabled={enviandoVerificacion}
                  onClick={() => responderVerificacion("si")}
                  className="btn-primary flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("si", "Sí")}
                </button>
                <button
                  type="button"
                  disabled={enviandoVerificacion}
                  onClick={() => {
                    if (enviandoVerificacionRef.current) return;
                    setMotivoNoSeleccionado("");
                    setModalVerificacionNoAbierta(true);
                  }}
                  className="btn-secondary flex-1 py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("no", "No")}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Rating Nudge / Form */}
        {(() => {
          const isClient = user?.id ? solicitud.solicitante_id === user.id : user?.tipo === "cliente";
          const hasConfirmedCompletion = isClient
            ? (solicitud.confirmo_realizacion_cliente || solicitud.verificado_por === solicitud.solicitante_id)
            : (solicitud.confirmo_realizacion_profesional || solicitud.verificado_por === solicitud.profesional_id);
          const hasUserRated = isClient ? solicitud.califico_cliente : solicitud.califico_profesional;
          const canRate = hasConfirmedCompletion && !hasUserRated && solicitud.estado !== "cancelada";

          if (!canRate) return null;

          return (
            <div className="card p-6 bg-amber-50 border-amber-200 shadow-sm">
              <FiStar className="text-amber-500 mx-auto mb-3" size={36} />
              <FormCalificacion
                titulo={
                  isClient
                    ? t("califica_al_profesional", "Calificá al profesional")
                    : t("califica_al_cliente", "Calificá al cliente")
                }
                nombreTarget={otroUsuario?.nombre}
                onSubmit={(calificacion, obs) => enviarCalificacion(calificacion, obs)}
                submitButtonText={t("enviar_calificacion", "Enviar calificación")}
              />
            </div>
          );
        })()}

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
        {["creada", "consulta", "aceptada"].includes(solicitud.estado) && (
          <div className="card p-3 flex items-end gap-2 bg-white sticky bottom-16 md:bottom-4 shadow-lg ring-1 ring-slate-200">
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

      <ModalCalificacion
        isOpen={modalCalificarAbierta}
        onClose={() => setModalCalificarAbierta(false)}
        onSubmit={enviarCalificacion}
        titulo={(user?.id ? solicitud.solicitante_id === user.id : user?.tipo === "cliente") ? "Calificá al profesional" : "Calificá al cliente"}
        nombreTarget={otroUsuario?.nombre}
      />

      {/* Modal Verification No (Reason selection) */}
      {modalVerificacionNoAbierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[90dvh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              onClick={() => setModalVerificacionNoAbierta(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {t("modal_no_realizado_titulo", "Motivo por el cual no se realizó")}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {t("modal_no_realizado_mensaje", "Por favor, indicá cuál de estas situaciones describe mejor el estado del trabajo:")}
            </p>

            <div className="space-y-3 mb-6">
              {[
                { key: "seguimos_coordinando", label: t("motivo_seguimos_coordinando", "Seguimos coordinando / acordando el trabajo") },
                { key: "no_llegamos_a_un_acuerdo", label: t("motivo_no_llegamos_acuerdo", "No llegamos a un acuerdo") },
                { key: "cambie_de_opinion", label: t("motivo_cambio_opinion", "Cambié de opinión / No voy a proceder con el trabajo") },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    motivoNoSeleccionado === opt.key
                      ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 text-blue-900 font-medium"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo_no"
                    value={opt.key}
                    checked={motivoNoSeleccionado === opt.key}
                    onChange={(e) => setMotivoNoSeleccionado(e.target.value)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm leading-snug">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalVerificacionNoAbierta(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
              >
                {t("cancelar", "Cancelar")}
              </button>
              <button
                onClick={() => responderVerificacion("no", motivoNoSeleccionado)}
                disabled={!motivoNoSeleccionado}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                {t("confirmar", "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleSolicitud;
