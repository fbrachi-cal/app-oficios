import { logger } from "../utils/logger";
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

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
  const { setUsuario } = useAuth();
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
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain,
        origin: window.location.origin,
        hostname,
        maskedPhone,
        appVerificationDisabled: (auth as any).settings.appVerificationDisabledForTesting || false,
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
    logger.info("Attempting to confirm code by linking credential", { hostname });

    try {
      if (!confirmacion) {
        throw new Error("No hay confirmación pendiente");
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("auth/no-current-user");
      }

      // Link the phone credential to the existing user instead of signing in separately
      const credential = PhoneAuthProvider.credential(confirmacion.verificationId, codigo);
      await linkWithCredential(currentUser, credential);

      // Force reload the user and refresh token to guarantee claims/tokens are updated in the local client session
      await currentUser.reload();
      await currentUser.getIdToken(true);

      // Trigger centralized auth state update to propagate phoneNumber immediately
      const reloadedUser = auth.currentUser;
      if (reloadedUser) {
        const userClone = Object.create(
          Object.getPrototypeOf(reloadedUser),
          Object.getOwnPropertyDescriptors(reloadedUser)
        );
        setUsuario(userClone);
      }

      setVerificado(true);
      logger.info("Code confirmed and phone linked successfully", { hostname });
      setLoading(false);
      return true;
    } catch (err: any) {
      const errorCode = err?.code || "unknown";
      const errorMessage = err?.message || String(err);

      logger.error("Failed code confirmation / linking", {
        hostname,
        errorCode,
        errorMessage
      });

      let friendlyError = "Código incorrecto o vencido. Por favor, verifique e intente de nuevo.";
      if (errorCode === "auth/no-current-user") {
        friendlyError = "No se detectó un usuario autenticado. Por favor, inicie sesión de nuevo.";
      } else if (errorCode === "auth/credential-already-in-use") {
        friendlyError = "Este teléfono ya está asociado a otra cuenta.";
      } else if (errorCode === "auth/account-exists-with-different-credential") {
        friendlyError = "El teléfono ya está registrado en otro perfil.";
      } else if (errorCode === "auth/provider-already-linked") {
        friendlyError = "Esta cuenta ya tiene un teléfono verificado y asociado.";
      } else if (errorCode === "auth/requires-recent-login") {
        friendlyError = "Para realizar esta acción, debe volver a iniciar sesión.";
      } else if (errorCode === "auth/invalid-verification-code") {
        friendlyError = "Código incorrecto o vencido. Por favor, verifique e intente de nuevo.";
      }

      setError(friendlyError);
      setLoading(false);
      return false;
    }
  };

  const reset = () => {
    clearRecaptcha();
    setConfirmacion(null);
    setError(null);
    setVerificado(false);
    setLoading(false);
  };

  return {
    enviarSMS,
    confirmarCodigo,
    verificado,
    error,
    setError,
    loading,
    reset,
    verificarCodigo: confirmarCodigo, // alias
    confirmationResult: confirmacion, // alias
  };
};
