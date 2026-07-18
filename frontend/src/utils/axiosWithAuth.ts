import axios, { AxiosHeaders,InternalAxiosRequestConfig } from "axios";
import { getAuth } from "firebase/auth";
import { cerrarSesion } from "../services/authService";

// Crear instancia de Axios
const axiosWithAuth = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Usa tu variable de entorno
});

// Interceptor para agregar token de Firebase a cada request
axiosWithAuth.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const user = getAuth().currentUser;
    if (!user) {
      // ⛔ Evita el envío si no hay usuario autenticado
      throw new axios.Cancel("No hay usuario autenticado");
    }else {
      const token = await user.getIdToken();

      // Si ya es instancia de AxiosHeaders
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        // Sino, la creamos correctamente
        config.headers = new AxiosHeaders(config.headers);
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para atrapar 401 (token expirado/inválido) y reintentar, o 403 (suspensiones/bloqueos) y redirigir
axiosWithAuth.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si responde con 401 y no hemos reintentado todavía
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const user = getAuth().currentUser;
        if (user) {
          // Forzar refresco de token Firebase
          const token = await user.getIdToken(true);
          
          // Actualizar cabecera de autorización en originalRequest
          if (originalRequest.headers instanceof AxiosHeaders) {
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
          } else {
            originalRequest.headers = new AxiosHeaders(originalRequest.headers);
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
          }
          
          // Reintentar la solicitud original con el nuevo token
          return axiosWithAuth(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403 && error.response?.data?.detail?.status) {
      const { status, reason, expires_at } = error.response.data.detail;
      const auth = getAuth();
      if (auth.currentUser) {
        await cerrarSesion();
      }
      const searchParams = new URLSearchParams();
      searchParams.set("status", status);
      if (reason) searchParams.set("reason", reason);
      if (expires_at) searchParams.set("expires_at", expires_at);
      
      window.location.href = `/bloqueado?${searchParams.toString()}`;
    }
    return Promise.reject(error);
  }
);

export default axiosWithAuth;
