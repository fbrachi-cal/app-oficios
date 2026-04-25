/**
 * Route guard that allows users with role 'admin' or 'recruiter'.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireRecruiter = () => {
  const { usuario, rol, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!usuario || (rol !== "admin" && rol !== "recruiter")) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default RequireRecruiter;
