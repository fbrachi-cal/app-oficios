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
  const { setUsuario } = useAuth();

  useEffect(() => {
    auth.signOut().then(() => {
      console.log("Sesión cerrada");
    });
  }, []);


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
      console.log("Vista previa generada:", objectUrl);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

      if (!res.ok) throw new Error("Error al guardar en backend");

      navigate("/");
      navigate(0);

    } catch (err: any) {
      console.error(err);
      setError("Error al registrar: " + err.message);
    }
  };

  const handleSocialSignup = async (provider: any) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();

      const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const userData = await res.json();
        if (userData && userData.id) {
          navigate("/");
        } else {
          navigate("/auth/completar-perfil");
        }
      } else if (res.status === 404 || res.status === 401) {
        navigate("/auth/completar-perfil");
      } else {
        setError("Error inesperado al verificar usuario");
      }
    } catch (err) {
      console.error(err);
      setError("Error al registrarse con red social");
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
                    Foto de perfil
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

                <div className="text-center mt-6">
                  <button
                    type="submit"
                    className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                  >
                    {t("crear_cuenta")}
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
