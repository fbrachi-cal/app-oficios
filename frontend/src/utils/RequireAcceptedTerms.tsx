import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

const RequireAcceptedTerms = () => {
  const { loading, usuario } = useAuth();
  const { user } = useUser();

  if (loading || (usuario && !user)) {
    // Si auth está cargando, o si estamos logueados en Firebase pero UserContext todavía no terminó de traer el perfil.
    return null;
  }

  // If user is loaded and explicitly requires tyc acceptance
  if (user?.requires_tyc_acceptance) {
    return <Navigate to="/terminos-y-condiciones" replace />;
  }

  return <Outlet />;
};

export default RequireAcceptedTerms;
