import React, { useState } from "react";
import { usePhoneVerification } from "../../hooks/usePhoneVerification";

interface Props {
  onVerified: (telefono: string) => void;
  t: (key: string) => string;
}

const VerificacionTelefono: React.FC<Props> = ({ onVerified, t }) => {
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState("");

  const {
    enviarSMS,
    confirmarCodigo,
    verificado,
    error,
    setError,
    verificarCodigo,
    confirmationResult,
  } = usePhoneVerification();

  console.log("CONFIRMAR CODIGO:", confirmarCodigo);
  console.log("SET ERROR CODIGO:", setError);


  const handleEnviarSMS = async () => {
    await enviarSMS(telefono);
  };

  const handleConfirmarCodigo = async () => {
    await verificarCodigo(codigo);
    if (!error) {
      onVerified(telefono);
    }
  };

  return (
    <div className="mb-4">
      {!verificado && (
        <>
          <label htmlFor="telefono" className="block text-xs font-bold mb-2">
            {t("telefono")}
          </label>
          <input
            id="telefono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow w-full"
            placeholder="+54 9 11 1234 5678"
          />
          <button
            type="button"
            onClick={handleEnviarSMS}
            className="text-xs text-blueGray-700 underline mt-1"
          >
            {t("verificar_telefono")}
          </button>

          {confirmationResult && (
            <>
              <label htmlFor="codigo" className="block text-xs font-bold mt-3 mb-2">
                {t("codigo_verificacion")}
              </label>
              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow w-full"
              />
              <button
                type="button"
                onClick={handleConfirmarCodigo}
                className="text-xs text-blueGray-700 underline mt-1"
              >
                {t("confirmar_codigo")}
              </button>
            </>
          )}
        </>
      )}
      {verificado && <p className="text-green-600 text-sm">{t("telefono_verificado")}</p>}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <div className="mt-4">
        <div id="recaptcha-container"></div>
      </div>

    </div>
    
  );
};

export default VerificacionTelefono;
