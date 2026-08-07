import { logger } from "../../utils/logger";
import React, { useState, useEffect, useRef } from "react";
import { usePhoneVerification } from "../../hooks/usePhoneVerification";

interface Props {
  onVerified: (telefono: string) => void;
  t: (key: string) => string;
}

const VerificacionTelefono: React.FC<Props> = ({ onVerified, t }) => {
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<any>(null);

  // Temporary diagnostics logs
  useEffect(() => {
    logger.info("VerificacionTelefono TEMP: component mounted");
    return () => {
      logger.info("VerificacionTelefono TEMP: component unmounted");
    };
  }, []);

  const {
    enviarSMS,
    verificado,
    error,
    loading,
    verificarCodigo,
    confirmationResult,
    setError,
    reset,
  } = usePhoneVerification();

  // Cooldown timer handler
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const handleEnviarSMS = async () => {
    setError(null);
    const trimmedPhone = telefono.trim();

    // 1. Validation: must start with '+'
    if (!trimmedPhone.startsWith("+")) {
      setError("Usá el formato internacional, por ejemplo +54911XXXXXXXX");
      return;
    }

    const success = await enviarSMS(trimmedPhone);
    logger.info("VerificacionTelefono TEMP: enviarSMS result", { success });
    if (success) {
      setCooldown(60); // 60 seconds cooldown
    }
  };

  const handleConfirmarCodigo = async () => {
    const trimmedCode = codigo.trim();
    if (trimmedCode.length !== 6) return;

    const success = await verificarCodigo(trimmedCode);
    logger.info("VerificacionTelefono TEMP: verificarCodigo result", { success, onVerifiedCalled: success });
    if (success) {
      onVerified(telefono.trim());
    }
  };

  const handleCambiarTelefono = () => {
    logger.info("VerificacionTelefono TEMP: Cambiar clicked / reset called");
    reset();
    setCodigo("");
    onVerified("");
  };

  const trimmedPhone = telefono.trim();
  const isCodeLengthValid = codigo.trim().length === 6;

  return (
    <div className="mb-4">
      {verificado ? (
        <div className="flex justify-between items-center mt-2 bg-green-50 border border-green-100 p-3 rounded-lg animate-in fade-in duration-200">
          <p className="text-green-700 text-sm font-semibold">
            ✓ {t("telefono_verificado")} ({trimmedPhone})
          </p>
          <button
            type="button"
            onClick={handleCambiarTelefono}
            disabled={loading}
            className="text-xs text-green-700 hover:text-green-900 underline font-semibold"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          {/* STEP 1: Phone input (Only shown when confirmationResult is missing) */}
          {!confirmationResult ? (
            <>
              <label htmlFor="telefono" className="block text-xs font-bold mb-2">
                {t("telefono")}
              </label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                disabled={loading}
                onChange={(e) => setTelefono(e.target.value)}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow w-full disabled:opacity-60"
                placeholder="+54 9 11 1234 5678"
              />
              <button
                type="button"
                onClick={handleEnviarSMS}
                disabled={loading || !trimmedPhone}
                className={`text-xs text-blueGray-700 underline mt-1 block ${
                  loading || !trimmedPhone ? "opacity-50 cursor-not-allowed" : "hover:text-blueGray-900"
                }`}
              >
                {loading ? "Enviando..." : t("verificar_telefono")}
              </button>
            </>
          ) : (
            /* STEP 2: Code confirmation (Shown when confirmationResult exists) */
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Número a verificar:</p>
                  <p className="text-sm font-semibold text-slate-800">{trimmedPhone}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCambiarTelefono}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Cambiar
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-2.5 rounded text-xs font-medium">
                Te enviamos un código por SMS.
              </div>

              <div>
                <label htmlFor="codigo" className="block text-xs font-bold mb-2">
                  {t("codigo_verificacion")}
                </label>
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  disabled={loading}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow w-full disabled:opacity-60 tracking-widest text-center font-bold text-lg"
                />
              </div>

              <div className="flex justify-between items-center pt-1.5">
                {cooldown > 0 ? (
                  <span className="text-xs text-slate-500">
                    Reenviar código en {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnviarSMS}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Reenviar código
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmarCodigo}
                  disabled={loading || !isCodeLengthValid}
                  className={`px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded shadow hover:bg-blue-700 transition-colors ${
                    loading || !isCodeLengthValid ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Confirmando..." : t("confirmar_codigo")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
      
      {/* The recaptcha container must always be present in the DOM for firebase. */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default VerificacionTelefono;
