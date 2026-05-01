/**
 * Route guard that allows users with role 'admin' or 'recruiter'.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireRecruiter = () => {
  const { usuario, tipo, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!usuario || (tipo !== "admin" && tipo !== "recruiter")) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default RequireRecruiter;
