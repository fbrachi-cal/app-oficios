import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../firebase";
import { cerrarSesion } from "../../services/authService";
import VerificacionTelefono from "../../components/Screens/VerificacionTelefono";
import config from "../../config";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
import { useUser } from "../../context/UserContext";
import { logger } from "../../utils/logger";
import { FiUser, FiBriefcase, FiMapPin, FiCamera, FiCheck, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { useCategorias } from "../../hooks/useCategorias";

const CompletarPerfil: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refrescarUsuario } = useUser();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefonoValidado, setTelefonoValidado] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "profesional">("cliente");
  const [zonas, setZonas] = useState<string[]>([]);
  const [oficios, setOficios] = useState<string[]>([]);

  // Terms Acceptance State
  const [aceptarTyc, setAceptarTyc] = useState(false);
  const [aceptarPrivacidad, setAceptarPrivacidad] = useState(false);
  const [aceptarResponsabilidad, setAceptarResponsabilidad] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<"tyc" | "privacidad" | "compromiso" | null>(null);

  const { categorias } = useCategorias();

  // Data State
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");

  // Temporary diagnostics logs
  useEffect(() => {
    logger.info("CompletarPerfil TEMP: component mounted");
    return () => {
      logger.info("CompletarPerfil TEMP: component unmounted");
    };
  }, []);

  logger.info("CompletarPerfil TEMP State:", {
    step,
    telefonoValidadoPresent: !!telefonoValidado,
  });

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
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
    if (user.photoURL) {
      setPreview(user.photoURL);
    }
    user.getIdToken().then(setToken);

    fetch(`${config.apiBaseUrl}/utils/zonas`).then(r => r.json()).then(setZonasDisponibles);
  }, [navigate]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleGuardarPerfil = async () => {
    logger.info("CompletarPerfil TEMP: handleGuardarPerfil called", { uid, telefonoValidadoPresent: !!telefonoValidado });
    setError("");
    setIsSubmitting(true);

    const user = auth.currentUser;
    if (!user) {
      setError(t("error_verificar_usuario"));
      setIsSubmitting(false);
      return;
    }

    if (user.uid !== uid) {
      logger.error("User UID mismatch in CompletarPerfil", { currentUid: user.uid, stateUid: uid });
      setError(t("error_verificar_usuario"));
      setIsSubmitting(false);
      return;
    }

    let fotoURL = user.photoURL || "";

    if (foto) {
      try {
        fotoURL = await subirImagenPerfil(foto, uid);
      } catch (err) {
        logger.error("Error subiendo foto", err);
      }
    }

    try {
      // Force reload the user and refresh the Firebase ID token to guarantee token has phone_number claims and is not revoked
      await user.reload();
      const tokenActualizado = await user.getIdToken(true);
      if (!tokenActualizado) {
        throw new Error(t("error_verificar_usuario"));
      }

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
        payload.subcategorias = oficios; // Keep subcategorias in sync for backend
      }

      const res = await fetch(`${config.apiBaseUrl}/usuarios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenActualizado}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detalleError = "";
        try {
          const errData = await res.json();
          detalleError = errData.detail || errData.message || "";
        } catch (_) {}
        throw new Error(detalleError || t("error_guardar_backend"));
      }

      let tycAccepted = false;
      try {
        const acceptRes = await fetch(`${config.apiBaseUrl}/usuarios/me/tyc/accept`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenActualizado}`,
            "Content-Type": "application/json",
          },
        });
        if (acceptRes.ok) {
          tycAccepted = true;
        } else {
          logger.error("Endpoint /usuarios/me/tyc/accept returned non-ok status", { status: acceptRes.status });
        }
      } catch (tycErr) {
        logger.error("Error al auto-aceptar términos en CompletarPerfil", tycErr);
      }

      await refrescarUsuario();
      if (tycAccepted) {
        navigate("/");
      } else {
        navigate("/terminos-y-condiciones");
      }
    } catch (err: any) {
      logger.error("Error al completar perfil", err);
      setError(err.message || t("error_completar_perfil", { detalle: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      return nombre.trim().length > 0 && 
             !!telefonoValidado && 
             aceptarTyc && 
             aceptarPrivacidad && 
             aceptarResponsabilidad;
    }
    if (step === 2) return true; // Tipo is always selected
    if (step === 3 && tipo === "profesional") return zonas.length > 0 && oficios.length > 0;
    return true;
  };

  const nextStep = () => {
    logger.info("CompletarPerfil TEMP: nextStep clicked", { step, telefonoValidadoPresent: !!telefonoValidado });
    if (canGoNext()) {
      if (step === 2 && tipo === "cliente") {
        handleGuardarPerfil(); // Skip step 3 for clients
      } else {
        setStep(s => s + 1);
      }
    }
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const toggleSelection = (item: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) setter(list.filter(i => i !== item));
    else setter([...list, item]);
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-lg">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Paso {step} de {tipo === "cliente" && step === 2 ? 2 : totalSteps}
            </span>
            <span className="text-sm font-bold text-blue-600">
              {step === 1 ? "Datos Personales" : step === 2 ? "Tipo de Cuenta" : "Especialidad"}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${(step / (tipo === "cliente" ? 2 : totalSteps)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 border-0 ring-1 ring-slate-200/50 shadow-md bg-white">
          
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Personal Info */}
          <div className={step === 1 ? "space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" : "hidden"}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Contanos sobre vos</h2>
                <p className="text-sm text-slate-500">Completá tus datos básicos para comenzar.</p>
              </div>

              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-50 shadow-sm group-hover:border-blue-400 transition-colors">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                        <FiUser size={32} />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 cursor-pointer hover:bg-slate-50 transition-colors">
                    <FiCamera size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  </label>
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Foto de perfil</span>
              </div>

              <div>
                <label className="input-label" htmlFor="nombre">{t("nombre")}</label>
                <input
                  id="nombre"
                  type="text"
                  className="input-base"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              {/* Assuming VerificacionTelefono handles its own UI, we just wrap it */}
              <div className="pt-2">
                <VerificacionTelefono t={t} onVerified={setTelefonoValidado} />
              </div>

              {/* Terms and conditions checkboxes */}
              <div className="mt-6 border-t border-slate-100 pt-4 space-y-4 text-left">
                {/* Checkbox 1 */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="checkbox-tyc"
                      type="checkbox"
                      checked={aceptarTyc}
                      onChange={(e) => setAceptarTyc(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="ml-3 text-xs leading-normal">
                    <label htmlFor="checkbox-tyc" className="font-medium text-slate-600 cursor-pointer select-none">
                      {t("he_leido_aceptar_tyc")}{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setModalAbierto("tyc");
                        }}
                        className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                      >
                        {t("terminos_condiciones")}
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
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="ml-3 text-xs leading-normal">
                    <label htmlFor="checkbox-privacidad" className="font-medium text-slate-600 cursor-pointer select-none">
                      {t("he_leido_aceptar_privacidad")}{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setModalAbierto("privacidad");
                        }}
                        className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                      >
                        {t("politica_privacidad")}
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
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="ml-3 text-xs leading-normal">
                    <label htmlFor="checkbox-responsabilidad" className="font-medium text-slate-600 cursor-pointer select-none">
                      {t("comprendo_responsabilidad_casa_click")}{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setModalAbierto("compromiso");
                        }}
                        className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                      >
                        ({t("ver_compromiso")})
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          {/* STEP 2: Account Type */}
          <div className={step === 2 ? "space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" : "hidden"}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¿Cómo querés usar la app?</h2>
                <p className="text-sm text-slate-500">Podés buscar ayuda o ofrecer tus servicios.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Cliente Option */}
                <div
                  onClick={() => setTipo("cliente")}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                    tipo === "cliente" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-3 rounded-full ${tipo === "cliente" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <FiUser size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">Busco un profesional</h3>
                    <p className="text-sm text-slate-500">Quiero contratar a alguien para que realice un trabajo.</p>
                  </div>
                  {tipo === "cliente" && <div className="absolute top-5 right-5 text-blue-600"><FiCheck size={20} /></div>}
                </div>

                {/* Profesional Option */}
                <div
                  onClick={() => setTipo("profesional")}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                    tipo === "profesional" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-3 rounded-full ${tipo === "profesional" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <FiBriefcase size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1">Soy un profesional</h3>
                    <p className="text-sm text-slate-500">Quiero ofrecer mis servicios y conseguir clientes.</p>
                  </div>
                  {tipo === "profesional" && <div className="absolute top-5 right-5 text-blue-600"><FiCheck size={20} /></div>}
                </div>
              </div>
            </div>

          {/* STEP 3: Professional Details (Zonas & Oficios) */}
          <div className={step === 3 && tipo === "profesional" ? "space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" : "hidden"}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Tus servicios</h2>
                <p className="text-sm text-slate-500">Seleccioná dónde trabajás y qué hacés.</p>
              </div>

              <div>
                <label className="input-label mb-3 flex items-center gap-1.5"><FiMapPin size={14} /> {t("zonas")}</label>
                <div className="flex flex-wrap gap-2">
                  {zonasDisponibles.map(z => {
                    const isSelected = zonas.includes(z);
                    return (
                      <button
                        key={z}
                        type="button"
                        onClick={() => toggleSelection(z, zonas, setZonas)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {z}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="input-label mt-6 mb-3 flex items-center gap-1.5"><FiBriefcase size={14} /> {t("oficios")}</label>
                <div className="space-y-4">
                  {categorias.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t(`categorias.${cat.nombre}`, { defaultValue: cat.nombre })}</h4>
                      <div className="flex flex-wrap gap-2">
                        {cat.subcategorias.map((sc: any) => {
                          const isSelected = oficios.includes(sc.nombre);
                          return (
                            <button
                              key={sc.nombre}
                              type="button"
                              onClick={() => toggleSelection(sc.nombre, oficios, setOficios)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {t(`categorias.${sc.nombre}`, { defaultValue: sc.nombre })}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex gap-3 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary px-4 py-3"
                disabled={isSubmitting}
              >
                <FiChevronLeft size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => cerrarSesion()}
                className="btn-secondary px-4 py-3 !text-rose-600 hover:!bg-rose-50 active:!bg-rose-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
            )}
            
            <button
              type="button"
              onClick={step === totalSteps || (step === 2 && tipo === "cliente") ? handleGuardarPerfil : nextStep}
              disabled={!canGoNext() || isSubmitting}
              className="btn-primary flex-1 py-3"
            >
              {isSubmitting ? (
                t("cargando")
              ) : step === totalSteps || (step === 2 && tipo === "cliente") ? (
                t("guardar_perfil")
              ) : (
                <>Siguiente <FiChevronRight size={18} /></>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Legal Text Modals */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col text-left">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-slate-800">
                {modalAbierto === "tyc" && t("terminos_condiciones")}
                {modalAbierto === "privacidad" && t("politica_privacidad")}
                {modalAbierto === "compromiso" && t("ver_compromiso")}
              </h3>
              <button
                onClick={() => setModalAbierto(null)}
                className="text-slate-500 hover:text-slate-800 text-2xl font-bold cursor-pointer outline-none focus:outline-none"
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-slate-600 whitespace-pre-wrap leading-relaxed flex-1">
              {modalAbierto === "tyc" && t("texto_terminos_condiciones")}
              {modalAbierto === "privacidad" && t("texto_politica_privacidad")}
              {modalAbierto === "compromiso" && t("texto_compromiso_comunidad")}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setModalAbierto(null)}
                className="bg-slate-800 text-white active:bg-slate-600 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none transition-all duration-150 cursor-pointer"
                type="button"
              >
                {t("cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletarPerfil;
