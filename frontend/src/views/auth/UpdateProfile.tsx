import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../../context/UserContext";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
import config from "../../config";
import { auth } from "../../firebase";
import { fetchConToken } from "../../utils/fetchConToken";
import { JSX } from "react/jsx-runtime";
import default_avatar from "../../assets/img/default_avatar.png";
import { useNavigate } from "react-router-dom";
import { useGamification } from "../../hooks/useGamification";
import GamificationBadge from "../../components/Gamification/GamificationBadge";
import { useCategorias } from "../../hooks/useCategorias";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import GeoAreaPicker from "../../components/Geo/GeoAreaPicker";


const UpdateProfile = (): JSX.Element => {
  const { t } = useTranslation();
  const { user, refrescarUsuario } = useUser();
  const navigate = useNavigate();
  const { data: gamificationData } = useGamification();


  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.foto || default_avatar);
  const [mensajeExito, setMensajeExito] = useState("");

  const [nombre, setNombre] = useState(user?.nombre || "");
  const [tipo] = useState<"cliente" | "profesional">(user?.tipo as "cliente" | "profesional");
  const [coberturaIds, setCoberturaIds] = useState<string[]>(user?.cobertura_ids || []);
  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [descripcion, setDescripcion] = useState<string>(user?.descripcion || "");
  const [disponibilidad, setDisponibilidad] = useState<string>(user?.disponibilidad || "");
  const [isInitialized, setIsInitialized] = useState(false);

  const { categorias } = useCategorias();


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
    if (user && !isInitialized) {
      setNombre(user.nombre || "");
      setCoberturaIds(user.cobertura_ids || []);
      setSubcategoriasSeleccionadas(user.subcategorias || user.oficios || []);
      setDescripcion(user.descripcion || "");
      setDisponibilidad(user.disponibilidad || "");
      if (user.foto) {
        setPreview(user.foto);
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  useEffect(() => {
    if (mensajeExito || error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [mensajeExito, error]);

  const handleCompartirApp = async () => {
    let publicUrl = config.publicUrl;
    if (!Capacitor.isNativePlatform() && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      publicUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_LANDING_URL || window.location.origin;
    }

    const shareTitle = t("titulo");
    const shareText = t("compartir_app_texto");

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: publicUrl,
          dialogTitle: t("recomendar_la_app"),
        });
      } catch (e) {
        logger.info("Native share sheet closed or canceled", e as Record<string, any>);
      }
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: publicUrl,
        });
      } catch (e) {
        logger.info("Web share sheet closed or canceled", e as Record<string, any>);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${publicUrl}`);
      setMensajeExito(t("compartir_app_exito"));
    } catch (e) {
      logger.error("Error copy clipboard", e);
      setError(t("compartir_app_error"));
    }
  };

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
        descripcion,
        disponibilidad,
      };

      if (tipo === "profesional") {
        if (coberturaIds.length === 0 || subcategoriasSeleccionadas.length === 0) {
          throw new Error(t("error_zonas_subcategorias"));
        }
        payload.cobertura_ids = coberturaIds;
        payload.subcategorias = subcategoriasSeleccionadas;
      }

      const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/me`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("error_actualizar_backend"));

      await refrescarUsuario();
      setMensajeExito(t("perfil_actualizado_exito") || "Perfil actualizado con éxito");

    } catch (err: any) {
      logger.error("Error al actualizar perfil", err);
      setError(t("error_actualizar_perfil", { detalle: err.message }));
    }
  };

  return (
    <div className="container mx-auto px-4 min-h-screen overflow-y-auto">
      <div className="flex flex-col items-center justify-start pt-8 pb-24 w-full">
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
              {/* Gamification badge — purely additive, never blocks the form */}
              {gamificationData && <GamificationBadge data={gamificationData} />}

              <div className="mt-4 mb-6 flex flex-col gap-3 justify-center">
                {user?.tipo === "cliente" && (
                  <button
                    type="button"
                    onClick={() => navigate("/recomendar-profesional")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg transition-all duration-150 w-full"
                  >
                    {t("referral.recommend_button", { defaultValue: "Recomendar un profesional" })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCompartirApp}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg transition-all duration-150 w-full"
                >
                  {t("recomendar_la_app")}
                </button>
              </div>

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
                    Teléfono (Verificado)
                  </label>
                  <input
                    type="text"
                    value={auth.currentUser?.phoneNumber || user?.telefono || ""}
                    disabled
                    className="border-0 px-3 py-3 text-blueGray-600 bg-slate-50 border border-slate-100 rounded text-sm shadow w-full cursor-not-allowed font-medium"
                  />
                </div>

                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("foto_perfil")}
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
                    {(user?.requires_coverage_setup || coberturaIds.length === 0) && (
                      <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-medium leading-relaxed">
                        <strong className="block text-sm mb-0.5">Actualizá tus zonas de cobertura</strong>
                        Seleccioná los barrios, localidades, comunas o partidos donde trabajás para aparecer en las búsquedas de clientes.
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="block mb-2 font-medium">{t("zonas")}</label>
                      <GeoAreaPicker
                        mode="pro"
                        selectedIds={coberturaIds}
                        onChange={setCoberturaIds}
                        placeholder="Buscar barrio, localidad, comuna o partido..."
                      />
                    </div>

                    <label className="block mb-1 font-medium">{t("categoria")}</label>
                    <select multiple
                      className="w-full mb-3 p-2 border rounded"
                      value={subcategoriasSeleccionadas}
                      onChange={e =>
                        setSubcategoriasSeleccionadas(Array.from(e.target.selectedOptions, o => o.value))
                      }
                    >
                      {categorias.map((cat) => (
                        <optgroup key={cat.id} label={t(`categorias.${cat.nombre}`, { defaultValue: cat.nombre })}>
                          {cat.subcategorias.map((sc: { nombre: string }) => (
                            <option key={`${cat.nombre}-${sc.nombre}`} value={sc.nombre}>
                              {t(`categorias.${sc.nombre}`, { defaultValue: sc.nombre })}
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

<div className="flex justify-between gap-4 mt-6">
  <button
    type="button"
    onClick={() => navigate(-1)} // ← esto te lleva a la página anterior
    className="bg-gray-300 text-gray-800 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-md w-1/2 transition-all duration-150"
  >
    {t("volver")}
  </button>

  <button
    type="submit"
    className="bg-blueGray-800 text-white text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg w-1/2 transition-all duration-150"
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

export default UpdateProfile;
