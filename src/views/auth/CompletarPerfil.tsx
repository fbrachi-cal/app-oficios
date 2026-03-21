import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../firebase";
import VerificacionTelefono from "../../components/Screens/VerificacionTelefono";


import config from "../../config";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
import { useUser } from "../../context/UserContext";
import { JSX } from "react/jsx-runtime";


const CompletarPerfil = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refrescarUsuario } = useUser();

  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "profesional">("cliente");
  const [zonas, setZonas] = useState<string[]>([]);
  const [oficios, setOficios] = useState<string[]>([]);
  
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");

  const [telefonoValidado, setTelefonoValidado] = useState("");


  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/login");
      return;
    }
    setUid(user.uid);
    setNombre(user.displayName || "");
    user.getIdToken().then(setToken);

    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles);

    fetch(`${config.apiBaseUrl}/utils/oficios`)
      .then((res) => res.json())
      .then(setOficiosDisponibles);
  }, [navigate]);

  
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    let fotoURL = auth.currentUser?.photoURL || "";

    if (foto) {
      fotoURL = await subirImagenPerfil(foto, uid);
    }

    try {
      const payload: any = {
        id: uid,
        nombre,
        tipo,
        telefono: telefonoValidado,
        foto: fotoURL
      };

      if (tipo === "profesional") {
        if (zonas.length === 0 || oficios.length === 0) {
          throw new Error(t("error_zonas_oficios"));
        }
        payload.zonas = zonas;
        payload.oficios = oficios;
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
      await refrescarUsuario();
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(t("error_completar_perfil", { detalle: err.message }));
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
                  {t("completar_perfil")}
                </h6>
              </div>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-3 font-bold">
                <small>{t("completar_datos_para_continuar")}</small>
              </div>
              {error && (
                <p className="text-red-500 text-center mb-3 text-sm">{error}</p>
              )}
              <form onSubmit={handleGuardarPerfil}>
                <div className="relative w-full mb-3">
                  <label htmlFor="nombre" className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("nombre")}
                  </label>
                  <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150" placeholder={t("nombre")} />
                </div>

                <VerificacionTelefono
                    t={t}
                    onVerified={(telefono:string) => setTelefonoValidado(telefono)}
                    />

                <div className="relative w-full mb-3">
                  <label htmlFor="foto" className="block uppercase text-blueGray-600 text-xs font-bold mb-2">{t("foto_perfil")}</label>
                  {preview && (<img src={preview} alt={t("vista_previa")} className="mb-3 rounded-full shadow-md w-20 h-20 object-cover mx-auto" />)}
                  <input id="foto" type="file" accept="image/*" onChange={handleFotoChange} className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow w-full" />
                </div>

                <div className="relative w-full mb-3">
                  <label htmlFor="tipo" className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("tipo_usuario")}
                  </label>
                  <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "cliente" | "profesional")} className="w-full mb-3 p-3 bg-white text-blueGray-600 rounded text-sm shadow">
                    <option value="cliente">{t("cliente")}</option>
                    <option value="profesional">{t("profesional")}</option>
                  </select>
                </div>

                {tipo === "profesional" && (
                  <>
                    <label className="block mb-1 font-medium">{t("zonas")}</label>
                    <select multiple className="w-full mb-3 p-2 border rounded" onChange={(e) => setZonas(Array.from(e.target.selectedOptions, (option) => option.value))}>
                      {zonasDisponibles.map((z) => (<option key={z} value={z}>{z}</option>))}
                    </select>
                    <label className="block mb-1 font-medium">{t("oficios")}</label>
                    <select multiple className="w-full mb-4 p-2 border rounded" onChange={(e) => setOficios(Array.from(e.target.selectedOptions, (option) => option.value))}>
                      {oficiosDisponibles.map((o) => (<option key={o} value={o}>{o}</option>))}
                    </select>
                  </>
                )}

                <div className="text-center mt-6">
                  <button type="submit" className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg w-full ease-linear transition-all duration-150">
                    {t("guardar_perfil")}
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

export default CompletarPerfil;
