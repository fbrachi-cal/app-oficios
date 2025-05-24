import { auth } from "../firebase";

/**
 * Hace una solicitud fetch incluyendo automáticamente el token de Firebase.
 * Refresca el token si es necesario.
 */
export const fetchConToken = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const user = auth.currentUser;

  if (!user) throw new Error("No hay usuario autenticado");

  try {
    // Refresca el token si está vencido
    const token = await user.getIdToken(true); // true = fuerza refresh si está cerca de expirar
    //console.log("TOKEN: "+token)

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("❌ Error obteniendo token de Firebase:", error);
    throw error;
  }
};

