import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { FiUsers, FiStar, FiCheckCircle } from "react-icons/fi";
import { useUser } from "../context/UserContext";
import AuthNavbar from "../components/Navbars/AuthNavbar";
import Footer from "../components/Footers/Footer";

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  // Role-based redirect for authenticated users
  useEffect(() => {
    if (user) {
      if (user.tipo === "profesional") {
        navigate("/actividad", { replace: true });
      } else {
        navigate("/buscar", { replace: true });
      }
    }
  }, [user, navigate]);

  // If user is loading or we are redirecting, render nothing to prevent flicker
  if (user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AuthNavbar transparent={false} />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mt-12 sm:mt-20 mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              {t("landing_hero_title")}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t("landing_hero_subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth/registro" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto btn-primary px-8 py-4 text-base">
                  {t("registrate_y_arregla")}
                </button>
              </Link>
              <Link to="/auth/login" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto btn-secondary px-8 py-4 text-base">
                  {t("iniciar_sesion")}
                </button>
              </Link>
            </div>
          </div>

          {/* Aggregated Stats Section */}
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-center">
              
              <div className="flex flex-col items-center pt-8 md:pt-0">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <FiUsers size={24} />
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">+500</h3>
                <p className="text-slate-500 font-medium">Profesionales activos</p>
              </div>

              <div className="flex flex-col items-center pt-8 md:pt-0">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                  <FiStar size={24} />
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">4.8/5</h3>
                <p className="text-slate-500 font-medium">Calificación promedio</p>
              </div>

              <div className="flex flex-col items-center pt-8 md:pt-0">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                  <FiCheckCircle size={24} />
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">+12k</h3>
                <p className="text-slate-500 font-medium">Trabajos completados</p>
              </div>

            </div>
          </div>

          {/* Value Prop Section */}
          <div className="max-w-4xl mx-auto text-center mb-24">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">
              ¿Por qué elegir nuestra plataforma?
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 text-left">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Conexión directa</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Sin intermediarios ni comisiones ocultas. Hablá directamente con el profesional y acordá el precio.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Perfiles verificados</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Revisamos cada perfil y priorizamos las calificaciones reales de otros usuarios.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-lg font-semibold text-slate-800 mb-2">100% Gratuito</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Publicar una solicitud es totalmente gratis para los clientes, sin costos de servicio.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
