import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

const RequireAcceptedTerms = () => {
  const { loading: authLoading, usuario } = useAuth();
  const { user, profileStatus, profileLoading } = useUser();
  const location = useLocation();

  const isCompletarPerfilPath = 
    location.pathname === "/completar-perfil" || 
    location.pathname === "/auth/completar-perfil";

  console.log("[Guard Log TEMP]", {
    pathname: location.pathname,
    firebaseUserExists: !!usuario,
    backendUserExists: !!user,
    profileStatus,
    profileLoading,
    authLoading,
    decision: (authLoading || profileLoading)
      ? "loading"
      : (!usuario
        ? "redirect to login"
        : (profileStatus === "missing"
          ? "render completar-perfil"
          : "render outlet")),
  });

  if (authLoading || profileLoading) {
    // Si auth está cargando, o si estamos logueados en Firebase pero UserContext todavía no terminó de traer el perfil.
    return null;
  }

  // Si no hay usuario de Firebase, redirigir al login
  if (!usuario) {
    return <Navigate to="/auth/login" replace />;
  }

  // Si el perfil no existe (404 en backend)
  if (profileStatus === "missing") {
    if (isCompletarPerfilPath) {
      return <Outlet />;
    }
    return <Navigate to="/completar-perfil" replace />;
  }

  // Si ocurrió un error (ej: 500) cargando el perfil
  if (profileStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-md border border-neutral-200">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de conexión</h2>
          <p className="text-neutral-600 mb-6">
            No pudimos conectar con el servidor para verificar tu perfil. Por favor, intenta de nuevo más tarde.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // If user is loaded and explicitly requires tyc acceptance
  if (user?.requires_tyc_acceptance) {
    if (location.pathname === "/terminos-y-condiciones") {
      return <Outlet />;
    }
    return <Navigate to="/terminos-y-condiciones" replace />;
  }

  return <Outlet />;
};

export default RequireAcceptedTerms;
