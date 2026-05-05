import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FiList, FiAlertCircle, FiStar } from "react-icons/fi";
import { useUser } from "../context/UserContext";
import { solicitudService } from "../services/solicitudService";
import { useLoading } from "../context/LoadingContext";
import ModalCalificacion from "../components/Modal/ModalCalifica";
import { logger } from "../utils/logger";

const ActividadView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setLoading } = useLoading();

  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Rating Modal state
  const [modalCalificarAbierta, setModalCalificarAbierta] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);

  useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        setLoading(true);
        const data = await solicitudService.obtenerSolicitudes();
        // Sort newest first based on status change date
        const sorted = data.sort(
          (a: any, b: any) =>
            new Date(b.fecha_cambio_estado).getTime() -
            new Date(a.fecha_cambio_estado).getTime()
        );
        setSolicitudes(sorted);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) cargarSolicitudes();
  }, [user, setLoading]);

  const pendingRatingSolicitud = solicitudes.find((s) => {
    if (s.estado !== "confirmada") return false;
    if (user?.tipo === "cliente" && !s.calificacion_cliente) return true;
    if (user?.tipo === "profesional" && !s.calificacion_profesional) return true;
    return false;
  });

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

      // Refresh list
      const data = await solicitudService.obtenerSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      logger.error("Error al calificar", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    const lower = estado?.toLowerCase();
    switch (lower) {
      case "confirmada":
        return <span className="badge badge-confirmed">{t(`estado.${lower}`)}</span>;
      case "aceptada":
        return <span className="badge badge-accepted">{t(`estado.${lower}`)}</span>;
      case "cancelada":
      case "rechazada":
        return <span className="badge badge-cancelled">{t(`estado.${lower}`)}</span>;
      case "creada":
      case "consulta":
      default:
        return <span className="badge badge-pending">{t(`estado.${lower}`)}</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
          {user?.tipo === "cliente" ? t("tus_solicitudes") : t("solicitudes_recibidas")}
        </h1>
        <p className="text-sm text-slate-500">
          {user?.tipo === "cliente"
            ? t("descripcion_tus_solicitudes")
            : t("descripcion_solicitudes_recibidas")}
        </p>
      </div>

      {/* Sticky Nudge Banner for Pending Ratings */}
      {pendingRatingSolicitud && (
        <div className="sticky top-[72px] z-20 mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-900">¡Tenés una calificación pendiente!</h4>
              <p className="text-sm text-amber-700 mt-0.5">
                Calificá el trabajo en {pendingRatingSolicitud.zona} para mantener la comunidad segura.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSolicitudSeleccionada(pendingRatingSolicitud);
              setModalCalificarAbierta(true);
            }}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {user?.tipo === "cliente" ? t("calificar_profesional") : t("calificar_cliente")}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl mb-6 text-sm border border-rose-200">
          {error}
        </div>
      )}

      {/* List / Empty State */}
      {!error && solicitudes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center mt-8 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
            <FiList size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay actividad</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {t("sin_solicitudes")}
          </p>
          {user?.tipo === "cliente" && (
            <button
              onClick={() => navigate("/buscar")}
              className="btn-primary"
            >
              {t("buscar_profesionales")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((s, i) => (
            <div
              key={i}
              onClick={() => {
                setLoading(true);
                navigate(`/solicitud/${s.id}`);
              }}
              className="card p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-300"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(s.estado)}
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {new Date(s.fecha_cambio_estado).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 truncate mb-1">
                  {s.subcategoria} en {s.zona}
                </h4>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {s.descripcion}
                </p>
                
                {/* Rating Visibility */}
                {s.estado === "confirmada" && (
                  <div className="flex flex-col gap-1 mt-2 border-t border-slate-100 pt-2">
                    {/* User's own rating */}
                    {user?.tipo === "cliente" && s.calificacion_cliente && (
                      <div className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <FiStar className="fill-amber-500 text-amber-500" />
                        {typeof s.calificacion_cliente === "number" ? `Calificaste con ${s.calificacion_cliente}` : "Ya calificaste este trabajo"}
                      </div>
                    )}
                    {user?.tipo === "profesional" && s.calificacion_profesional && (
                      <div className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <FiStar className="fill-amber-500 text-amber-500" />
                        {typeof s.calificacion_profesional === "number" ? `Calificaste al cliente con ${s.calificacion_profesional}` : "Ya calificaste al cliente"}
                      </div>
                    )}
                    
                    {/* Counterpart's rating */}
                    {user?.tipo === "cliente" && s.calificacion_profesional && (
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <FiStar className="fill-slate-400 text-slate-400" />
                        {typeof s.calificacion_profesional === "number" ? `El profesional te calificó con ${s.calificacion_profesional}` : "El profesional ya te calificó"}
                      </div>
                    )}
                    {user?.tipo === "profesional" && s.calificacion_cliente && (
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <FiStar className="fill-slate-400 text-slate-400" />
                        {typeof s.calificacion_cliente === "number" ? `El cliente te calificó con ${s.calificacion_cliente}` : "El cliente ya te calificó"}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {s.fotos_urls?.length > 0 && (
                <div className="shrink-0 flex -space-x-2">
                  {s.fotos_urls.slice(0, 3).map((url: any, j: number) => (
                    <img
                      key={j}
                      src={url.thumbnail || url.original}
                      alt="adjunto"
                      className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm"
                    />
                  ))}
                  {s.fotos_urls.length > 3 && (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm z-10">
                      +{s.fotos_urls.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Rating (opened from Nudge) */}
      <ModalCalificacion
        isOpen={modalCalificarAbierta}
        onClose={() => setModalCalificarAbierta(false)}
        onSubmit={enviarCalificacion}
        titulo={t("califica_al_profesional")}
      />

    </div>
  );
};

export default ActividadView;
