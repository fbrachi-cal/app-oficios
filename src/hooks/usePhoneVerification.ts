import { logger } from "../utils/logger";
// src/hooks/usePhoneVerification.ts
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber} from "firebase/auth";
import { auth } from "../firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export const usePhoneVerification = () => {
  const [confirmacion, setConfirmacion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificado, setVerificado] = useState(false);
  

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  const setupRecaptcha = async () => {
    if (!window.recaptchaVerifier) {      
      logger.info("⏳ Montando RecaptchaVerifier", { auth });
      window.recaptchaVerifier = new RecaptchaVerifier(auth,
        "recaptcha-container",
        {
          size: "normal",
          callback: (response: any) => {
            logger.info("✅ reCAPTCHA resuelto", { response });
          },
          "expired-callback": () => {
            logger.info("⚠️ reCAPTCHA expirado");
          },
        }
      );
      await window.recaptchaVerifier.render();
    }
  };
  
  const enviarSMS = async (telefonoE164: string) => {
    try {
      if (!window.recaptchaVerifier) {
        await setupRecaptcha();
      }
  
      logger.info("Enviando SMS a", { telefonoE164 });
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Recaptcha no disponible");
  
      const result = await signInWithPhoneNumber(auth, telefonoE164, appVerifier);
      setConfirmacion(result);
      return true;
    } catch (err: any) {
      logger.error("Error sending SMS", err);
      setError(err.message);
      return false;
    }
  };
  

  const confirmarCodigo = async (codigo: string) => {
    try {
      if (!confirmacion) throw new Error("No hay confirmación pendiente");
      await confirmacion.confirm(codigo);
      setVerificado(true);
      return true;
    } catch (err: any) {
      logger.error("Error verifying code", err);
      setError("Código incorrecto");
      return false;
    }
  };

  return {
    enviarSMS,
    confirmarCodigo,
    verificado,
    error,
    setError,
    verificarCodigo: confirmarCodigo, // alias
    confirmationResult: confirmacion, // alias
  };
};
