import { auth } from "../firebase";
import { logger } from "./logger";

/**
 * Hace una solicitud fetch incluyendo automáticamente el token de Firebase.
 * Refresca el token si es necesario y envía el ID de correlación.
 */
export const fetchConToken = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const user = auth.currentUser;

  if (!user) {
    logger.error("No hay usuario autenticado al intentar hacer fetch", null, { url });
    throw new Error("No hay usuario autenticado");
  }

  const correlationId = crypto.randomUUID();

  try {
    // Refresca el token si está vencido
    const token = await user.getIdToken(true);

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Correlation-ID": correlationId,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
       logger.warn(`API returned status ${response.status}`, { url, correlationId });
    }

    return response;
  } catch (error) {
    logger.error("❌ Error en fetchConToken", error, { url, correlationId });
    throw error;
  }
};

