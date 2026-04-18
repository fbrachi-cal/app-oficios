import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaUserTimes, FaCalendarAlt, FaInfoCircle, FaArrowLeft } from "react-icons/fa";

export const BlockedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get("status") || "DEACTIVATED";
  const reason = searchParams.get("reason");
  const expiresAtStr = searchParams.get("expires_at");

  // Visuals depending on status
  let title = "Cuenta Restringida";
  let description = "Tu cuenta ha perdido el acceso a la plataforma.";
  let colorClass = "text-red-500";
  let bgIconClass = "bg-red-500/10";

  switch (status) {
    case "SUSPENDED":
      title = "Cuenta Suspendida";
      description = "Tu cuenta se encuentra temporalmente suspendida debido a una infracción de nuestras políticas.";
      colorClass = "text-orange-500";
      bgIconClass = "bg-orange-500/10";
      break;
    case "EXPELLED":
      title = "Cuenta Expulsada";
      description = "Tu cuenta ha sido expulsada de manera permanente. No podrás usar nuestros servicios.";
      colorClass = "text-red-600";
      bgIconClass = "bg-red-600/10";
      break;
    case "DEACTIVATED":
      title = "Cuenta Desactivada";
      description = "Tu cuenta ha sido desactivada lógicamente por un administrador.";
      colorClass = "text-gray-500";
      bgIconClass = "bg-gray-500/10";
      break;
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  };

  const expiresDate = formatDate(expiresAtStr);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700/50">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${bgIconClass}`}>
            <FaUserTimes className={`text-5xl ${colorClass}`} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-center mb-6 leading-relaxed">
          {description}
        </p>

        <div className="space-y-4 mb-8">
          {reason && (
            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="text-blue-400 mt-1 shrink-0" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Motivo
                  </span>
                  <p className="text-sm text-slate-200">{reason}</p>
                </div>
              </div>
            </div>
          )}

          {expiresDate && status === "SUSPENDED" && (
            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700">
              <div className="flex items-start gap-3">
                <FaCalendarAlt className="text-emerald-400 mt-1 shrink-0" />
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Expira el
                  </span>
                  <p className="text-sm text-slate-200 font-medium">{expiresDate}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
        >
          <FaArrowLeft className="text-sm" />
          Volver al Inicio
        </button>

        <p className="text-center text-xs text-slate-500 mt-6">
          Si crees que esto es un error, por favor contacta a soporte.
        </p>
      </div>
    </div>
  );
};

export default BlockedPage;
