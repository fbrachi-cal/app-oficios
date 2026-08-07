import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireVerifiedPhone = () => {
  const { loading: authLoading, usuario } = useAuth();
  const location = useLocation();

  const isVerificarTelefonoPath = location.pathname === "/auth/verificar-telefono";

  if (authLoading) {
    return null;
  }

  if (!usuario) {
    return <Navigate to="/auth/login" replace />;
  }

  const hasPhone = !!usuario.phoneNumber;

  if (!hasPhone) {
    if (isVerificarTelefonoPath) {
      return <Outlet />;
    }
    return <Navigate to="/auth/verificar-telefono" state={{ from: location }} replace />;
  }

  if (isVerificarTelefonoPath) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireVerifiedPhone;
