import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGamification } from "../../hooks/useGamification";
import { createProfessionalReferral, ReferralCreatePayload } from "../../services/referralService";
import config from "../../config";
import { logger } from "../../utils/logger";
import { useUser } from "../../context/UserContext";

const RecomendarProfesional: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { refresh } = useGamification();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [zona, setZona] = useState("");
  const [comentario, setComentario] = useState("");
  const [trabajoPrevio, setTrabajoPrevio] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [subcategoriasDisponibles, setSubcategoriasDisponibles] = useState<{ nombre: string }[]>([]);

  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only clientes can recommend
    if (user && user.tipo !== "cliente") {
      navigate("/buscar");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/utils/zonas`)
      .then((res) => res.json())
      .then(setZonasDisponibles)
      .catch((err) => logger.error("Error fetching zonas", err));

    fetch(`${config.apiBaseUrl}/utils/categorias`)
      .then((res) => res.json())
      .then(setCategorias)
      .catch((err) => logger.error("Error fetching categorias", err));
  }, []);

  useEffect(() => {
    if (categoria) {
      const cat = categorias.find((c) => c.nombre === categoria);
      setSubcategoriasDisponibles(cat ? cat.subcategorias : []);
      setSubcategoria(""); // Reset subcategory when category changes
    } else {
      setSubcategoriasDisponibles([]);
    }
  }, [categoria, categorias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMensajeExito("");

    if (!nombre.trim()) {
      setError(t("referral.error_name_required", { defaultValue: "El nombre del profesional es obligatorio." }));
      return;
    }

    if (!telefono.trim() && !email.trim()) {
      setError(t("referral.error_contact_required", { defaultValue: "Debes ingresar al menos un teléfono o un correo electrónico." }));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ReferralCreatePayload = {
        professional_name: nombre.trim(),
        professional_phone: telefono.trim() || undefined,
        professional_email: email.trim() || undefined,
        category: categoria || undefined,
        subcategory: subcategoria || undefined,
        zone: zona || undefined,
        comment: comentario.trim() || undefined,
        worked_with_before: trabajoPrevio,
      };

      await createProfessionalReferral(payload);
      
      setMensajeExito(t("referral.success_message", { 
        defaultValue: "¡Recomendación enviada con éxito! Tu reputación aumentará cuando el profesional se registre utilizando este mismo correo o teléfono." 
      }));
      
      refresh(); // Refresh gamification state so it checks for level ups later (though this won't level up immediately, it's good practice)
      
      // Reset form
      setNombre("");
      setTelefono("");
      setEmail("");
      setCategoria("");
      setSubcategoria("");
      setZona("");
      setComentario("");
      setTrabajoPrevio(false);

    } catch (err: any) {
      setError(err.message || t("error_generico", { defaultValue: "Ocurrió un error inesperado." }));
    } finally {
      setIsSubmitting(false);
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
                  {t("referral.title", { defaultValue: "Recomendar un profesional" })}
                </h6>
              </div>
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <div className="text-blueGray-400 text-center mb-5 font-bold">
                <small>
                  {t("referral.subtitle", { defaultValue: "Conocés a un buen profesional? Recomendalo y ganá puntos de reputación cuando se una a la plataforma." })}
                </small>
              </div>

              {mensajeExito && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm text-center">
                  {mensajeExito}
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("nombre")} *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("ejemplo_nombre", { defaultValue: "Ej: Carlos Plomero" })}
                  />
                </div>

                <div className="relative w-full mb-3 flex gap-4">
                  <div className="w-1/2">
                    <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                      {t("telefono")}
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      disabled={isSubmitting}
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder={t("ejemplo_telefono", { defaultValue: "Ej: 1122334455" })}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                      {t("email")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder={t("ejemplo_email", { defaultValue: "correo@ejemplo.com" })}
                    />
                  </div>
                </div>
                <div className="text-xs text-blueGray-400 mb-4 text-center">
                  {t("referral.contact_hint", { defaultValue: "Es necesario proveer al menos el teléfono o el email del profesional." })}
                </div>

                <div className="relative w-full mb-3 flex gap-4">
                  <div className="w-1/2">
                    <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                      {t("categoria")}
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full p-3 bg-white text-blueGray-600 rounded text-sm shadow border-0 focus:outline-none focus:ring ease-linear transition-all duration-150"
                    >
                      <option value="">{t("seleccionar")}</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                      {t("subcategoria")}
                    </label>
                    <select
                      value={subcategoria}
                      onChange={(e) => setSubcategoria(e.target.value)}
                      disabled={!categoria || isSubmitting}
                      className="w-full p-3 bg-white text-blueGray-600 rounded text-sm shadow border-0 focus:outline-none focus:ring ease-linear transition-all duration-150"
                    >
                      <option value="">{t("seleccionar")}</option>
                      {subcategoriasDisponibles.map((sc, idx) => (
                        <option key={idx} value={sc.nombre}>{sc.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("zona_principal", { defaultValue: "Zona principal de trabajo" })}
                  </label>
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full p-3 bg-white text-blueGray-600 rounded text-sm shadow border-0 focus:outline-none focus:ring ease-linear transition-all duration-150"
                  >
                    <option value="">{t("seleccionar")}</option>
                    {zonasDisponibles.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    {t("comentario", { defaultValue: "Comentario adicional" })}
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder={t("referral.comment_placeholder", { defaultValue: "¿Por qué lo recomendás?" })}
                  />
                </div>

                <div className="relative w-full mb-6">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trabajoPrevio}
                      onChange={(e) => setTrabajoPrevio(e.target.checked)}
                      disabled={isSubmitting}
                      className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                    />
                    <span className="ml-2 text-sm font-semibold text-blueGray-600">
                      {t("referral.worked_with_before", { defaultValue: "He trabajado con este profesional anteriormente" })}
                    </span>
                  </label>
                </div>

                <div className="flex justify-between gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                    className="bg-gray-300 text-gray-800 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-md w-1/2 transition-all duration-150 disabled:opacity-50"
                  >
                    {t("volver")}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blueGray-800 text-white text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg w-1/2 transition-all duration-150 disabled:opacity-50"
                  >
                    {isSubmitting ? t("enviando", { defaultValue: "Enviando..." }) : t("referral.submit_button", { defaultValue: "Recomendar" })}
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

export default RecomendarProfesional;
