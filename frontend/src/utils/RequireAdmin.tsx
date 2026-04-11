/**
 * Route guard that allows only users with role 'admin'.
 * - While auth is loading → renders nothing (avoids flash)
 * - Not authenticated or wrong role → redirects to /home
 * - Admin → renders <Outlet /> (nested routes)
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireAdmin = () => {
  const { usuario, rol, loading } = useAuth();

  if (loading) {
    // Auth state is still resolving — render nothing to avoid redirect flash
    return null;
  }

  if (!usuario || rol !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
