import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiStar, FiMapPin, FiBriefcase, FiClock } from "react-icons/fi";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useLoading } from "../../context/LoadingContext";
import { solicitudService } from "../../services/solicitudService";
import { logger } from "../../utils/logger";
import default_avatar from "../../assets/img/default_avatar.png";
import ModalSolicitud from "../../components/Modal/ModalSolicitud";
import FormSolicitud from "../../components/Forms/FormSolicitud";
import { ChatDrawer } from "../../components/Chat/ChatDrawer";

const PerfilProfesional: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { setLoading } = useLoading();

  const [profesional, setProfesional] = useState<any>(null);
  const [isSolicitudOpen, setIsSolicitudOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const obtenerProfesional = async () => {
      try {
        setLoading(true);
        const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/${id}`);
        const data = await res.json();
        setProfesional(data);
      } catch (err) {
        logger.error("Error cargando perfil", err);
      } finally {
        setLoading(false);
      }
    };

    obtenerProfesional();
  }, [id, setLoading]);

  if (!profesional) return null; // Loading state is handled globally by useLoading

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
      {/* Toast message */}
      {mensaje && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-semibold flex items-center gap-2">
          {mensaje}
        </div>
      )}

      {/* Header compact */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-700"
          title={t("volver")}
        >
          <FiChevronLeft size={24} />
        </button>
        <h1 className="text-base font-bold text-slate-900 truncate px-4">
          {profesional.nombre}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      <main className="container mx-auto px-4 max-w-2xl py-8">
        {/* Profile Info */}
        <div className="text-center mb-10">
          <img
            src={profesional.foto || default_avatar}
            alt={profesional.nombre}
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-white shadow-sm"
          />
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{profesional.nombre}</h2>
          <p className="text-slate-500 font-medium">
            {profesional.subcategorias?.join(", ") || t("sin_oficios")}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="card p-4 text-center">
            <FiBriefcase className="mx-auto text-blue-500 mb-2" size={20} />
            <div className="text-xl font-bold text-slate-900">{profesional.cantidadCalificaciones ?? 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{t("trabajos")}</div>
          </div>
          <div className="card p-4 text-center">
            <FiStar className="mx-auto text-amber-400 mb-2" size={20} />
            <div className="text-xl font-bold text-slate-900">{profesional.promedioCalificacion ?? 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{t("calificacion")}</div>
          </div>
          <div className="card p-4 text-center">
            <FiClock className="mx-auto text-emerald-500 mb-2" size={20} />
            <div className="text-xl font-bold text-slate-900">{profesional.disponibilidad || "N/A"}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{t("disponibilidad")}</div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Acerca de</h3>
          <p className="text-slate-600 leading-relaxed bg-white p-5 rounded-2xl border border-slate-200">
            {profesional.descripcion || t("sin_descripcion_profesional")}
          </p>
        </div>

        {/* Zonas */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FiMapPin className="text-slate-400" /> {t("zonas")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {profesional.zonas?.map((z: string, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200/60">
                {z}
              </span>
            )) || <span className="text-slate-500 italic">{t("sin_zonas_asignadas")}</span>}
          </div>
        </div>
      </main>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-40" style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}>
        <div className="container mx-auto max-w-2xl">
          <button
            onClick={() => setIsSolicitudOpen(true)}
            className="w-full btn-primary py-4 text-base shadow-md"
          >
            {t("contactar")}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ModalSolicitud isOpen={isSolicitudOpen} onClose={() => setIsSolicitudOpen(false)}>
        <h2 className="text-xl font-bold mb-4 text-slate-900">{t("nueva_solicitud")}</h2>
        <FormSolicitud
          zonasDisponibles={profesional.zonas || []}
          subcategoriasDisponibles={profesional.subcategorias || []}
          onCancel={() => setIsSolicitudOpen(false)}
          onSubmit={async (data) => {
            try {
              setLoading(true);
              if (!id) return;
              await solicitudService.crearSolicitud(id, data);
              setMensaje("✅ " + t("solicitud_enviada_exito"));
              setIsSolicitudOpen(false);
              setTimeout(() => {
                setMensaje(null);
                navigate("/actividad"); // Redirigir a actividad después del éxito
              }, 2000);
            } catch (error) {
              logger.error("Error al enviar solicitud", error);
              setMensaje("❌ " + t("error_enviar_solicitud"));
              setTimeout(() => setMensaje(null), 4000);
            } finally {
              setLoading(false);
            }
          }}
        />
      </ModalSolicitud>

      {/* Chat is preserved conceptually, though trigger is Contactar */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialProfessionalId={id}
      />
    </div>
  );
};

export default PerfilProfesional;
