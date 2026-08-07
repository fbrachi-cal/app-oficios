import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cerrarSesion } from "../../services/authService";
import VerificacionTelefono from "../../components/Screens/VerificacionTelefono";
import logoOficiosImg from "../../assets/img/logo.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const VerificacionTelefonoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { refrescarUsuario } = useUser();

  const handleVerified = async (phone: string) => {
    if (phone) {
      await refrescarUsuario();
      const fromPath = location.state?.from?.pathname || "/";
      navigate(fromPath, { replace: true });
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener: any;

    const setupListener = async () => {
      backButtonListener = await App.addListener("backButton", () => {
        const confirmExit = window.confirm(
          "¿Estás seguro de que querés salir de la aplicación? Tu progreso no se guardará hasta verificar el teléfono."
        );
        if (confirmExit) {
          App.exitApp();
        }
      });
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* App Identity */}
        <div className="text-center mb-8">
          <img
            src={logoOficiosImg}
            alt="Click"
            className="h-16 w-auto mx-auto mb-3 object-contain"
          />
          <p className="text-base font-semibold text-slate-500 tracking-wide">{t("titulo")}</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-md border-0 bg-white ring-1 ring-slate-200/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verificación de Teléfono</h2>
            <p className="text-sm text-slate-500">
              Para continuar, necesitamos verificar tu número de celular.
            </p>
          </div>

          <VerificacionTelefono t={t} onVerified={handleVerified} />

          <div className="mt-6 border-t border-slate-100 pt-6">
            <button
              onClick={() => cerrarSesion()}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold py-3 px-4 rounded-xl transition-colors text-center text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificacionTelefonoPage;
