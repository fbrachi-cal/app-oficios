import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth } from "../../firebase";
import config from "../../config";

import facebookIcon from "../../assets/img/facebook.svg";
import googleIcon from "../../assets/img/google.svg";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
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
  const [tipo, setTipo] = useState<"cliente" | "profesional">("cliente");
  const [zonas, setZonas] = useState<string[]>([]);
  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [subcategoriasDisponibles, setSubcategoriasDisponibles] = useState<{ nombre: string, orden: number }[]>([]);
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState<string>("");
  const [disponibilidad, setDisponibilidad] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUsuario, usuario } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const { refrescarUsuario, profileStatus, profileLoading, user: backendUser } = useUser();

  const [aceptarTyc, setAceptarTyc] = useState(false);
  const [aceptarPrivacidad, setAceptarPrivacidad] = useState(false);
  const [aceptarResponsabilidad, setAceptarResponsabilidad] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<"tyc" | "privacidad" | "compromiso" | null>(null);

  useEffect(() => {
    auth.signOut().then(() => {
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
      }
    }
  }, [usuario, profileStatus, profileLoading, backendUser, navigate]);


  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);


  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles);

    fetch(`${config.apiBaseUrl}/utils/categorias`)
      .then((res) => res.json())
      .then(setCategorias);
  }, []);

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/categorias`)
      .then((res) => res.json())
      .then((data) => {
        setCategorias(data);
        const todas = data.flatMap((cat: any) =>
          cat.subcategorias.map((sub: any) => ({
            nombre: sub.nombre,
            categoria: cat.nombre,
          }))
        );
        setSubcategoriasDisponibles(todas);
      });
  }, []);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      logger.info("Vista previa generada", { objectUrl });
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptarTyc || !aceptarPrivacidad || !aceptarResponsabilidad) {
      setError(t("error_aceptar_terminos_privacidad_responsabilidad"));
      return;
    }
    setError("");
    setIsSubmitting(true);
    setGlobalLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      setUsuario?.(user);
      const token = await user.getIdToken();

      // ⬆️ Subir foto si hay
      let fotoPerfil = null;
      if (foto) {
        fotoPerfil = await subirImagenPerfil(foto, user.uid);
      }

      const payload: any = {
        id: user.uid,
        nombre,
        tipo,
        foto: fotoPerfil,
        descripcion,
        disponibilidad,
      };

      if (tipo === "profesional") {
        if (zonas.length === 0 || subcategoriasSeleccionadas.length === 0) {
          throw new Error(t("error_zonas_subcategorias"));
        }
        payload.zonas = zonas;
        payload.subcategorias = subcategoriasSeleccionadas;
      }

      const res = await fetch(`${config.apiBaseUrl}/usuarios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("error_guardar_backend"));

      try {
        await fetch(`${config.apiBaseUrl}/usuarios/me/tyc/accept`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (tycErr) {
        logger.error("Error al auto-aceptar términos en backend", tycErr);
      }

      await refrescarUsuario();
      navigate("/");

    } catch (err: any) {
      logger.error("Error al registrar", err);
      setError(t("error_registrar", { detalle: err.message }));
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  const handleSocialSignup = async (provider: any) => {
    if (!aceptarTyc || !aceptarPrivacidad || !aceptarResponsabilidad) {
      setError(t("error_aceptar_terminos_privacidad_responsabilidad"));
      return;
    }
    setError("");
    setIsSubmitting(true);
    setGlobalLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // Centralized useEffect handles redirect
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
              <div className="text-center mb-3">
                <h6 className="text-blueGray-500 text-sm font-bold">
                  {t("registrarse_con")}
                </h6>
              </div>
              <div className="btn-wrapper text-center">
                <button
                  onClick={() => handleSocialSignup(new FacebookAuthProvider())}
                  className="bg-white active:bg-blueGray-50 text-blueGray-700 font-normal px-4 py-2 rounded outline-none focus:outline-none mr-2 mb-1 uppercase shadow hover:shadow-md inline-flex items-center font-bold text-xs ease-linear transition-all duration-150"
                  type="button"
                >
                  <img alt="Github" className="w-5 mr-1" src={facebookIcon} />
                  Facebook
                </button>
                <button
                  onClick={() => handleSocialSignup(new GoogleAuthProvider())}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("email")}
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label
                    htmlFor="foto"
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  >
                    {t("foto_perfil")}
                  </label>
                  {/* Vista previa */}
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="mb-3 rounded-full shadow-md w-20 h-20 object-cover mx-auto"
                    />
                  )}
                  <input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="********"
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label
                    htmlFor="tipo"
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                  >
                    {t("tipo_usuario")}
                  </label>
                  <select
                    id="tipo"
                    value={tipo}
                    onChange={(e) =>
                      setTipo(e.target.value as "cliente" | "profesional")
                    }
                    className="w-full mb-3 p-3 bg-white text-blueGray-600 rounded text-sm shadow"
                  >
                    <option value="cliente">{t("cliente")}</option>
                    <option value="profesional">{t("profesional")}</option>
                  </select>
                </div>

                {tipo === "profesional" && (
                  <>
                    <label className="block mb-1 font-medium">{t("zonas")}</label>
                    <select
                      multiple
                      className="w-full mb-3 p-2 border rounded"
                      onChange={(e) =>
                        setZonas(
                          Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                    >
                      {zonasDisponibles.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>

                    <label className="block mb-1 font-medium">{t("categoria")}</label>
                    <select multiple
                      className="w-full mb-3 p-2 border rounded"
                      value={subcategoriasSeleccionadas}
                      onChange={e =>
                        setSubcategoriasSeleccionadas(Array.from(e.target.selectedOptions, o => o.value))
                      }
                    >
                      {categorias.map((cat) => (
                        <optgroup key={cat.id} label={cat.nombre}>
                          {cat.subcategorias.map((sc: { nombre: string }) => (
                            <option key={`${cat.nombre}-${sc.nombre}`} value={sc.nombre}>
                              {sc.nombre}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>



                    <div className="relative w-full mb-3">
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        {t("descripcion")}
                      </label>
                      <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>

                    <div className="relative w-full mb-3">
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        {t("disponibilidad")}
                      </label>
                      <input
                        type="text"
                        value={disponibilidad}
                        onChange={(e) => setDisponibilidad(e.target.value)}
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>

                  </>
                )}

                {/* Terms and conditions checkboxes */}
                <div className="mt-6 border-t border-blueGray-200 pt-4 space-y-4">
                  {/* Checkbox 1 */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="checkbox-tyc"
                        type="checkbox"
                        checked={aceptarTyc}
                        onChange={(e) => setAceptarTyc(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-blueGray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs leading-normal">
                      <label htmlFor="checkbox-tyc" className="font-medium text-blueGray-600 cursor-pointer select-none">
                        He leído y acepto los{" "}
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalAbierto("tyc");
                          }}
                          className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                        >
                          Términos y Condiciones de Uso
                        </span>
                        .
                      </label>
                    </div>
                  </div>

                  {/* Checkbox 2 */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="checkbox-privacidad"
                        type="checkbox"
                        checked={aceptarPrivacidad}
                        onChange={(e) => setAceptarPrivacidad(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-blueGray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs leading-normal">
                      <label htmlFor="checkbox-privacidad" className="font-medium text-blueGray-600 cursor-pointer select-none">
                        He leído y acepto la{" "}
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalAbierto("privacidad");
                          }}
                          className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                        >
                          Política de Privacidad
                        </span>
                        .
                      </label>
                    </div>
                  </div>

                  {/* Checkbox 3 */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="checkbox-responsabilidad"
                        type="checkbox"
                        checked={aceptarResponsabilidad}
                        onChange={(e) => setAceptarResponsabilidad(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-blueGray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs leading-normal">
                      <label htmlFor="checkbox-responsabilidad" className="font-medium text-blueGray-600 cursor-pointer select-none">
                        Comprendo que Casa Click es una plataforma que facilita el contacto entre usuarios y profesionales independientes, sin participar en la contratación, ejecución ni cobro de los servicios ofrecidos.{" "}
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalAbierto("compromiso");
                          }}
                          className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                        >
                          (Ver Compromiso de Comunidad)
                        </span>
                      </label>
                    </div>
                  </div>
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

      {/* Legal Text Modals */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-blueGray-200 flex justify-between items-center bg-blueGray-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-blueGray-800">
                {modalAbierto === "tyc" && "Términos y Condiciones de Uso"}
                {modalAbierto === "privacidad" && "Política de Privacidad"}
                {modalAbierto === "compromiso" && "Compromiso de Comunidad"}
              </h3>
              <button
                onClick={() => setModalAbierto(null)}
                className="text-blueGray-500 hover:text-blueGray-800 text-2xl font-bold cursor-pointer outline-none focus:outline-none"
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-blueGray-600 whitespace-pre-wrap leading-relaxed flex-1">
              {modalAbierto === "tyc" && t("texto_terminos_condiciones")}
              {modalAbierto === "privacidad" && t("texto_politica_privacidad")}
              {modalAbierto === "compromiso" && t("texto_compromiso_comunidad")}
            </div>
            <div className="px-6 py-4 border-t border-blueGray-200 flex justify-end bg-blueGray-50 rounded-b-lg">
              <button
                onClick={() => setModalAbierto(null)}
                className="bg-blueGray-800 text-white active:bg-blueGray-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none transition-all duration-150 cursor-pointer"
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
