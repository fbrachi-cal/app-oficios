import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase";
import { iniciarSesionConGoogle, cerrarSesion } from "../../services/authService";

import facebookIcon from "../../assets/img/facebook.svg";
import googleIcon from "../../assets/img/google.svg";
import { useAuth } from "../../context/AuthContext";
import { useLoading } from "../../context/LoadingContext";
import { useUser } from "../../context/UserContext";
import { JSX } from "react/jsx-runtime";

const Register = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUsuario, usuario } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const { refrescarUsuario, profileStatus, profileLoading, user: backendUser } = useUser();

  useEffect(() => {
    cerrarSesion().then(() => {
      logger.info("Sesión cerrada");
    });
  }, []);

  // Centralized redirect effect
  useEffect(() => {
    if (usuario && !profileLoading) {
      setGlobalLoading(false);
      if (profileStatus === "ready" && backendUser) {
        if (backendUser.requires_tyc_acceptance) {
          navigate("/terminos-y-condiciones", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } else if (profileStatus === "missing") {
        navigate("/completar-perfil", { replace: true });
      } else if (profileStatus === "error") {
        setError(t("error_verificar_usuario"));
        cerrarSesion();
      }
    }
  }, [usuario, profileStatus, profileLoading, backendUser, navigate]);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    setGlobalLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // Update name in Firebase profile
      await updateProfile(user, { displayName: nombre });

      setUsuario?.(user);

      // Force refresh user profile status from backend to trigger "missing" status
      await refrescarUsuario(user);

    } catch (err: any) {
      logger.error("Error al registrar", err);
      setError(t("error_registrar", { detalle: err.message }));
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };
  const handleGoogleSignup = async () => {
    setError("");
    setIsSubmitting(true);
    setGlobalLoading(true);
    try {
      await iniciarSesionConGoogle();
    } catch (err: any) {
      logger.error("Error en registro con Google", err);
      const msg = err?.message || String(err);
      if (
        msg.toLowerCase().includes("cancel") || 
        msg.toLowerCase().includes("popup_closed_by_user") || 
        msg.toLowerCase().includes("user-cancelled")
      ) {
        setIsSubmitting(false);
        setGlobalLoading(false);
      } else {
        setError(t("error_registro_red_social"));
        setIsSubmitting(false);
        setGlobalLoading(false);
      }
    }
  };

  const handleSocialSignup = async (provider: any) => {
    setError("");
    setIsSubmitting(true);
    setGlobalLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      logger.error("Error en registro social", err);
      setError(t("error_registro_red_social"));
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full lg:w-6/12 px-4">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
            <div className="rounded-t mb-0 px-6 py-6">
              <>
                <div className="text-center mb-3">
                  <h6 className="text-blueGray-500 text-sm font-bold">
                    {t("registrarse_con")}
                  </h6>
                </div>
                <div className="btn-wrapper text-center flex flex-wrap justify-center items-center gap-2">
                  <button
                    onClick={handleGoogleSignup}
                    className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150"
                    type="button"
                  >
                    <img alt="Google" className="w-5 mr-1" src={googleIcon} />
                    Google
                  </button>

                  {Capacitor.isNativePlatform() ? (
                    <div className="w-full text-center text-xs text-blueGray-500 font-semibold mt-1">
                      El registro con Facebook no está disponible en la app móvil.
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSocialSignup(new FacebookAuthProvider())}
                      className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150"
                      type="button"
                    >
                      <img alt="Facebook" className="w-5 mr-1" src={facebookIcon} />
                      Facebook
                    </button>
                  )}
                </div>
              </>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-3 font-bold">
                <small>{t("registrarse_con_credenciales")}</small>
              </div>
              {error && (
                <p className="text-red-500 text-center mb-3 text-sm">{error}</p>
              )}
              <form onSubmit={handleRegistro}>
                <div className="relative w-full mb-3">
                  <label
                    htmlFor="nombre"
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  >
                    {t("nombre")}
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("nombre")}
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label
                    htmlFor="email"
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  >
                    {t("email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("email")}
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label
                    htmlFor="password"
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  >
                    {t("password")}
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="********"
                  />
                </div>

                <div className="text-center mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? t("registrando_usuario") : t("crear_cuenta")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
