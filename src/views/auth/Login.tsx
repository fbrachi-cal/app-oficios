import { logger } from "../../utils/logger";
import React, {useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import config from "../../config";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth } from "../../firebase";
import facebookIcon from "../../assets/img/facebook.svg";
import googleIcon from "../../assets/img/google.svg";
import { useUser } from "../../context/UserContext";
import { useLoading } from "../../context/LoadingContext";
import { JSX } from "react/jsx-runtime";



const Login = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { refrescarUsuario } = useUser();

  const { setLoading } = useLoading();


  const handleLogin = async (e: React.FormEvent) => {
    logger.info("HANDLE LOGIN LOADING true!");
    setLoading(true);
    e.preventDefault();
    setError("");
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
  
      const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (res.ok) {        
        const userData = await res.json();
        logger.info("USUARIO LOGIN: "+JSON.stringify(userData));
        // Podés guardar userData en un contexto global si querés
        if (
          userData.tipo === "profesional" &&
          (!userData.oficios?.length || !userData.zonas?.length)
        ) {
          navigate("/auth/completar-perfil");
        } else if (userData.tipo === "admin" || userData.tipo === "moderator") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else if (res.status === 404 || res.status === 401) {
        navigate("/auth/completar-perfil");
      } else {
        setError(t("error_verificar_usuario"));
      }
    } catch (err) {
      logger.error(err);
      setError(t("error_usuario_password"));
    }finally{ 
      logger.info("HANDLE LOGIN LOADING false!");
      setLoading(false);
    }
  };
  

  const handleSocialLogin = async (providerInstance: any) => {
    try {
      logger.info("SET LOADING A TRUE");
      setLoading(true);
      logger.info("🚀 Antes del popup");
      const result = await signInWithPopup(auth, providerInstance);
      logger.info("✅ Después del popup"); // <-- este no va a aparecer si el componente se desmonta

      const user = result.user;
      const token = await user.getIdToken();

      await refrescarUsuario();

  
      const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (res.ok) {
        const userData = await res.json();
        logger.info("USUARIO LOGIN: "+JSON.stringify(userData));
        if (
          userData.tipo === "profesional" &&
          (!userData.oficios?.length || !userData.zonas?.length)
        ) {
          navigate("/auth/completar-perfil");
        } else if (userData.tipo === "admin" || userData.tipo === "moderator") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else if (res.status === 404 || res.status === 401) {
        navigate("/auth/completar-perfil");
      } else {
        setError(t("error_verificar_usuario"));
      }
    } catch (err) {
      logger.error(err);
      setError(t("error_inicio_sesion"));
    }finally{
      logger.info("SET LOADING A FALSE");
      setTimeout(() => setLoading(false), 500); // 500 ms de delay      
      //setLoading(true);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 h-full">
        <div className="flex content-center items-center justify-center h-full">
          <div className="w-full lg:w-4/12 px-4">
            <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
              <div className="rounded-t mb-0 px-6 py-6">
                <div className="text-center mb-3">
                  <h6 className="text-blueGray-500 text-sm font-bold">
                    {t("iniciar_sesion_con")}
                  </h6>
                </div>
                <div className="btn-wrapper text-center">
                  <button
                    onClick={() => handleSocialLogin(new FacebookAuthProvider())}
                    className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none mr-2 mb-1 uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150"
                    type="button"
                  >
                    <img alt="Facebook" className="w-5 mr-1" src={facebookIcon} />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleSocialLogin(new GoogleAuthProvider())}
                    className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150"
                    type="button"
                  >
                    <img alt="Google" className="w-5 mr-1" src={googleIcon} />
                    Google
                  </button>
                </div>
                <hr className="mt-6 border-b-1 border-blueGray-300" />
              </div>
              <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                <div className="text-blueGray-400 text-center mb-3 font-bold">
                  <small>{t("o_ingresar_con_credenciales")}</small>
                </div>
                {error && (
                  <p className="text-red-500 text-center mb-3 text-sm">
                    {error}
                  </p>
                )}
                <form onSubmit={handleLogin}>
                  <div className="relative w-full mb-3">
                    <label
                      className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      htmlFor="email"
                    >
                      {t("email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder={t("email")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="relative w-full mb-3">
                    <label
                      className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      htmlFor="password"
                    >
                      {t("password")}
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder={t("password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        id="customCheckLogin"
                        type="checkbox"
                        className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                      />
                      <span className="ml-2 text-sm font-semibold text-blueGray-600">
                        {t("recordarme")}
                      </span>
                    </label>
                  </div>

                  <div className="text-center mt-6">
                    <button
                      className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                      type="submit"
                    >
                      {t("ingresar")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="flex flex-wrap mt-6 relative">
              <div className="w-1/2">
                <a
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                    e.preventDefault()
                  }
                  className="text-blueGray-200"
                >
                  <small>{t("olvido_password")}</small>
                </a>
              </div>
              <div className="w-1/2 text-right">
                <Link to="/auth/register" className="text-blueGray-200">
                  <small>{t("crear_cuenta_nueva")}</small>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
