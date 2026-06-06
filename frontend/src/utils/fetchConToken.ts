import { auth } from "../firebase";
import { logger } from "./logger";

/**
 * Gets a fresh token directly from the currentUser.
 * Handles forcing a refresh if requested.
 */
export const getAuthToken = async (forceRefresh = false): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No hay usuario autenticado");
  }
  return await user.getIdToken(forceRefresh);
};

/**
 * Hace una solicitud fetch incluyendo automáticamente el token de Firebase.
 * Implementa reintento automático de una vez en caso de 401 (token expirado/inválido).
 */
export const fetchConToken = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const correlationId = crypto.randomUUID();

  const getHeaders = (token: string) => ({
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Correlation-ID": correlationId,
  });

  try {
    // 1. Intentar obtener el token de manera normal (desde cache)
    let token = await getAuthToken(false);

    // 2. Realizar la primera solicitud
    let response = await fetch(url, {
      ...options,
      headers: getHeaders(token),
    });

    // 3. Si responde con 401, forzar refresco del token e intentar una vez más
    if (response.status === 401) {
      logger.info("fetchConToken: 401 detectado, reintentando con token refrescado", { url, correlationId });
      try {
        token = await getAuthToken(true);
        response = await fetch(url, {
          ...options,
          headers: getHeaders(token),
        });
      } catch (retryError) {
        logger.error("fetchConToken: Error al reintentar con token refrescado", retryError, { url, correlationId });
        throw retryError;
      }
    }

    if (!response.ok) {
       logger.warn(`API returned status ${response.status}`, { url, correlationId });
    }

    return response;
  } catch (error) {
    logger.error("❌ Error en fetchConToken", error, { url, correlationId });
    throw error;
  }
};

