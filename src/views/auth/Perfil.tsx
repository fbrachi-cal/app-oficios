import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../../context/UserContext";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
import config from "../../config";
import { auth } from "../../firebase";

const Perfil = (): JSX.Element => {
  const { t } = useTranslation();
  const { user, refrescarUsuario } = useUser();

  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.foto || null);
  const [mensajeExito, setMensajeExito] = useState("");

  const [nombre, setNombre] = useState(user?.nombre || "");
  const [tipo, setTipo] = useState<"cliente" | "profesional">(user?.tipo || "cliente");
  const [zonas, setZonas] = useState<string[]>(user?.zonas || []);
  const [oficios, setOficios] = useState<string[]>(user?.oficios || []);
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles);

    fetch(`${config.apiBaseUrl}/utils/oficios`)
      .then((res) => res.json())
      .then(setOficiosDisponibles);
  }, []);

  const handleActualizarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMensajeExito("");
    let fotoURL = user?.foto || auth.currentUser?.photoURL || "";

    if (foto) {
      fotoURL = await subirImagenPerfil(foto, user!.id);
    }

    try {
      const payload: any = {
        id: user!.id,
        nombre,
        tipo,
        foto: fotoURL,
      };

      if (tipo === "profesional") {
        if (zonas.length === 0 || oficios.length === 0) {
          throw new Error(t("error_zonas_oficios"));
        }
        payload.zonas = zonas;
        payload.oficios = oficios;
      }

      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al actualizar en backend");

      await refrescarUsuario();
      setMensajeExito(t("perfil_actualizado_exito") || "Perfil actualizado con éxito");

    } catch (err: any) {
      console.error(err);
      setError("Error al actualizar perfil: " + err.message);
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
                  {t("perfil")}
                </h6>
              </div>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-3 font-bold">
                <small>{t("actualiza_tu_informacion")}</small>
              </div>
              {mensajeExito && (
                <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-center text-sm mb-3">
                  {mensajeExito}
                </p>
              )}
              {error && (
                <p className="text-red-500 text-center mb-3 text-sm">{error}</p>
              )}
              <form onSubmit={handleActualizarPerfil}>
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("nombre")}
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("nombre")}
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    Foto de perfil
                  </label>
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="mb-3 rounded-full shadow-md w-20 h-20 object-cover mx-auto"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("tipo_usuario")}
                  </label>
                  <select
                    value={tipo}
                    disabled
                    className="w-full mb-3 p-3 bg-gray-100 text-blueGray-600 rounded text-sm shadow cursor-not-allowed"
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
                      value={zonas}
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

                    <label className="block mb-1 font-medium">{t("oficios")}</label>
                    <select
                      multiple
                      className="w-full mb-4 p-2 border rounded"
                      value={oficios}
                      onChange={(e) =>
                        setOficios(
                          Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                    >
                      {oficiosDisponibles.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <div className="text-center mt-6">
                  <button
                    type="submit"
                    className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                  >
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

export default Perfil;
