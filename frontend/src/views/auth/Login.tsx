import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth } from "../../firebase";
import config from "../../config";
import { useUser } from "../../context/UserContext";
import { useLoading } from "../../context/LoadingContext";
import { logger } from "../../utils/logger";

// Icons
import { FiMail, FiLock } from "react-icons/fi";
import googleIcon from "../../assets/img/google.svg";
import facebookIcon from "../../assets/img/facebook.svg";
import logoOficiosImg from "../../assets/img/logo_oficios.png";

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refrescarUsuario } = useUser();
  const { setLoading } = useLoading();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const procesarLoginBackend = async (token: string) => {
    const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const userData = await res.json();
      if (
        userData.tipo === "profesional" &&
        (!userData.oficios?.length || !userData.zonas?.length)
      ) {
        navigate("/completar-perfil");
      } else if (userData.tipo === "admin" || userData.tipo === "moderator") {
        navigate("/admin");
      } else if (userData.tipo === "recruiter") {
        navigate("/recruiter/cvs");
      } else {
        navigate("/");
      }
    } else if (res.status === 404) {
      navigate("/completar-perfil");
    } else if (res.status === 403) {
      const errorData = await res.json();
      const searchParams = new URLSearchParams();
      if (errorData.detail?.status) searchParams.set("status", errorData.detail.status);
      if (errorData.detail?.reason) searchParams.set("reason", errorData.detail.reason);
      if (errorData.detail?.expires_at) searchParams.set("expires_at", errorData.detail.expires_at);
      navigate(`/bloqueado?${searchParams.toString()}`);
    } else if (res.status === 401) {
      setError("La sesión ha expirado o el token es inválido.");
    } else {
      setError(t("error_verificar_usuario"));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      await procesarLoginBackend(token);
    } catch (err) {
      logger.error("Error en login con email", err);
      setError(t("error_usuario_password"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerInstance: any) => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, providerInstance);
      const token = await result.user.getIdToken();
      await refrescarUsuario();
      await procesarLoginBackend(token);
    } catch (err) {
      logger.error("Error en login social", err);
      setError(t("error_inicio_sesion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        
        {/* App Identity */}
        <div className="text-center mb-8">
          <img
            src={logoOficiosImg}
            alt={t("titulo")}
            className="h-16 w-auto mx-auto mb-3 object-contain"
          />
          <p className="text-base font-semibold text-slate-500 tracking-wide">{t("titulo")}</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-md border-0 bg-white ring-1 ring-slate-200/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("bienvenido")}</h2>
            <p className="text-sm text-slate-500">{t("iniciar_sesion_con")}</p>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleSocialLogin(new GoogleAuthProvider())}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              type="button"
            >
              <img alt="Google" className="w-5 h-5" src={googleIcon} />
              Continuar con Google
            </button>
            <button
              onClick={() => handleSocialLogin(new FacebookAuthProvider())}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              type="button"
            >
              <img alt="Facebook" className="w-5 h-5" src={facebookIcon} />
              Continuar con Facebook
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-400 font-medium">{t("o_ingresar_con_credenciales")}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="input-label" htmlFor="email">
                {t("email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-base pl-10"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="password">
                {t("password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="input-base pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-600">
                  {t("recordarme")}
                </span>
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                {t("olvido_password")}
              </a>
            </div>

            <button type="submit" className="w-full btn-primary py-3.5 text-base shadow-md">
              {t("ingresar")}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-600 text-sm">
            ¿No tienes cuenta?{" "}
            <Link to="/auth/registro" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              {t("crear_cuenta_nueva")}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
