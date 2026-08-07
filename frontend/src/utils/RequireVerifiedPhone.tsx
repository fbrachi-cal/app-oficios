import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

const RequireVerifiedPhone = () => {
  const { loading: authLoading, usuario } = useAuth();
  const { profileStatus, profileLoading } = useUser();
  const location = useLocation();

  const isVerificarTelefonoPath = location.pathname === "/auth/verificar-telefono";

  if (authLoading) {
    return null;
  }

  if (!usuario) {
    return <Navigate to="/auth/login" replace />;
  }

  if (profileLoading) {
    return null;
  }

  const hasPhone = !!usuario.phoneNumber;

  if (!hasPhone) {
    if (isVerificarTelefonoPath) {
      return <Outlet />;
    }
    return <Navigate to="/auth/verificar-telefono" state={{ from: location }} replace />;
  }

  if (isVerificarTelefonoPath) {
    if (profileStatus === "missing") {
      return <Navigate to="/completar-perfil" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireVerifiedPhone;
