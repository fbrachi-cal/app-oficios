import { logger } from "../utils/logger";
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

// Private helper to safely mask phone numbers in logs
const maskPhone = (phone: string): string => {
  if (!phone) return "";
  if (phone.length <= 8) return "****";
  return phone.slice(0, 4) + "*".repeat(phone.length - 8) + phone.slice(-4);
};

export const usePhoneVerification = () => {
  const [confirmacion, setConfirmacion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        logger.error("Error clearing recaptchaVerifier", {
          message: e instanceof Error ? e.message : String(e)
        });
      }
      delete window.recaptchaVerifier;
    }
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const enviarSMS = async (telefonoE164: string) => {
    if (loading) return false;
    setLoading(true);
    setError(null);
    setConfirmacion(null);

    const hostname = window.location.hostname;
    const maskedPhone = maskPhone(telefonoE164);
    const previousVerifierExisted = !!window.recaptchaVerifier;

    logger.info("Starting SMS verification attempt", {
      hostname,
      maskedPhone,
      previousVerifierExisted
    });

    try {
      // 1. Clear previous recaptcha verifier
      clearRecaptcha();

      // 2. Ensure container exists
      const container = document.getElementById("recaptcha-container");
      if (!container) {
        throw new Error("recaptcha_container_missing");
      }

      // 3. Create new RecaptchaVerifier
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",
          callback: () => {
            logger.info("reCAPTCHA solved successfully");
          },
          "expired-callback": () => {
            logger.info("reCAPTCHA expired");
          },
        }
      );

      await window.recaptchaVerifier.render();

      // 4. Send SMS
      const result = await signInWithPhoneNumber(auth, telefonoE164, window.recaptchaVerifier);
      setConfirmacion(result);

      logger.info("SMS sent successfully", {
        hostname,
        maskedPhone,
        confirmationResultCreated: !!result
      });

      setLoading(false);
      return true;
    } catch (err: any) {
      // Clean up recaptcha verifier on failure so we get a clean slate for retry
      clearRecaptcha();

      const errorCode = err?.code || "unknown";
      const errorMessage = err?.message || String(err);

      logger.error("Failed SMS verification attempt", {
        hostname,
        maskedPhone,
        errorCode,
        errorMessage
      });

      // Map to user-friendly error message
      let friendlyError = "Error al enviar el SMS. Por favor, intente de nuevo.";
      if (err?.message === "recaptcha_container_missing") {
        friendlyError = "El contenedor de verificación no está disponible en la interfaz.";
      } else if (errorCode === "auth/invalid-phone-number") {
        friendlyError = "Número de teléfono inválido. Asegúrese de incluir el código de país (ej. +54 9 11 ...).";
      } else if (errorCode === "auth/captcha-check-failed") {
        friendlyError = "La verificación de reCAPTCHA falló. Por favor, intente de nuevo.";
      } else if (errorCode === "auth/too-many-requests") {
        friendlyError = "Demasiados intentos. Por favor, intente más tarde.";
      }

      setError(friendlyError);
      setConfirmacion(null);
      setLoading(false);
      return false;
    }
  };

  const confirmarCodigo = async (codigo: string) => {
    if (loading) return false;
    setLoading(true);
    setError(null);

    const hostname = window.location.hostname;
    logger.info("Attempting to confirm code", { hostname });

    try {
      if (!confirmacion) {
        throw new Error("No hay confirmación pendiente");
      }
      await confirmacion.confirm(codigo);
      setVerificado(true);
      logger.info("Code confirmed successfully", { hostname });
      setLoading(false);
      return true;
    } catch (err: any) {
      const errorCode = err?.code || "unknown";
      const errorMessage = err?.message || String(err);

      logger.error("Failed code confirmation", {
        hostname,
        errorCode,
        errorMessage
      });

      setError("Código incorrecto o vencido. Por favor, verifique e intente de nuevo.");
      setLoading(false);
      return false;
    }
  };

  return {
    enviarSMS,
    confirmarCodigo,
    verificado,
    error,
    setError,
    loading,
    verificarCodigo: confirmarCodigo, // alias
    confirmationResult: confirmacion, // alias
  };
};
