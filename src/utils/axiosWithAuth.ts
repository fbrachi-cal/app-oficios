import axios, { AxiosHeaders,InternalAxiosRequestConfig } from "axios";
import { getAuth } from "firebase/auth";

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

export default axiosWithAuth;
