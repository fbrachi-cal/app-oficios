import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../firebase";
import VerificacionTelefono from "../../components/Screens/VerificacionTelefono";
import config from "../../config";
import { subirImagenPerfil } from "../../utils/subirImagenPerfil";
import { useUser } from "../../context/UserContext";
import { logger } from "../../utils/logger";
import { FiUser, FiBriefcase, FiMapPin, FiCamera, FiCheck, FiChevronRight, FiChevronLeft } from "react-icons/fi";

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

  // Data State
  const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
  const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");

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
    user.getIdToken().then(setToken);

    fetch(`${config.apiBaseUrl}/utils/zonas`).then(r => r.json()).then(setZonasDisponibles);
    fetch(`${config.apiBaseUrl}/utils/oficios`).then(r => r.json()).then(setOficiosDisponibles);
  }, [navigate]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleGuardarPerfil = async () => {
    setError("");
    setIsSubmitting(true);
    let fotoURL = auth.currentUser?.photoURL || "";

    if (foto) {
      try {
        fotoURL = await subirImagenPerfil(foto, uid);
      } catch (err) {
        logger.error("Error subiendo foto", err);
      }
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
      logger.error("Error al completar perfil", err);
      setError(err.message || t("error_completar_perfil", { detalle: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return nombre.trim().length > 0 && telefonoValidado;
    if (step === 2) return true; // Tipo is always selected
    if (step === 3 && tipo === "profesional") return zonas.length > 0 && oficios.length > 0;
    return true;
  };

  const nextStep = () => {
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
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
            </div>
          )}

          {/* STEP 2: Account Type */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
          )}

          {/* STEP 3: Professional Details (Zonas & Oficios) */}
          {step === 3 && tipo === "profesional" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                <div className="flex flex-wrap gap-2">
                  {oficiosDisponibles.map(o => {
                    const isSelected = oficios.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => toggleSelection(o, oficios, setOficios)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-8 flex gap-3 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary px-4 py-3"
                disabled={isSubmitting}
              >
                <FiChevronLeft size={20} />
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
    </div>
  );
};

export default CompletarPerfil;
