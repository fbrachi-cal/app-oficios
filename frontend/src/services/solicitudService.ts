import { logger } from "../utils/logger";
import { fetchConToken } from "../utils/fetchConToken";
import config from "../config";
import axiosWithAuth from "../utils/axiosWithAuth";

export const solicitudService = {

    async crearSolicitud(profesionalId: string, data: {
        zona: string;
        subcategoria: string;
        descripcion: string;
        fotos: File[] | null;
    }) {
        const formData = new FormData();
        formData.append("zona", data.zona);
        formData.append("subcategoria", data.subcategoria);
        formData.append("descripcion", data.descripcion);
        if (data.fotos) {
            Array.from(data.fotos).forEach((foto) => {
                formData.append("fotos", foto); // <- name debe coincidir con el backend
            });
        }

        const res = await axiosWithAuth.post(`/solicitudes/${profesionalId}`, formData);
        return res.data;
    },
    async obtenerSolicitudes() {
        try {
            const response = await axiosWithAuth.get("/solicitudes/mis");
            return response.data;
        } catch (error) {
            logger.error("❌ Error al obtener solicitudes", error);
            throw new Error("No se pudieron cargar las solicitudes. Verificá tu conexión o intentá más tarde.");
        }
    },
    async obtenerSolicitudPorId(id: string) {
        try {
            const res = await axiosWithAuth.get(`/solicitudes/${id}`);
            return res.data;
        } catch (error) {
            logger.error("❌ Error al obtener solicitud", error);
            throw new Error("No se pudo cargar la solicitud. Verificá tu conexión o intentá más tarde.");
        }
    },
    actualizarRespuestaProfesional: async (solicitudId: string, body: {
        nuevo_estado: string;
        fechas_propuestas: string[];
        observacion_profesional: string;
    }) => {
        const url = `${config.apiBaseUrl}/solicitudes/${solicitudId}/responder`;

        const response = await fetchConToken(url, {
            method: "PATCH", // o "PUT" si tu backend espera reemplazo completo
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error("No se pudo actualizar la solicitud");
        }

        return await response.json();
    },
    async enviarConsulta(id: string, data: { mensaje: string; fotos?: string[] }) {
        try {
            const res = await axiosWithAuth.patch(`/solicitudes/${id}/consultar`, data);
            return res.data;
        } catch (err) {
            logger.error("❌ Error enviando consulta", err);
            throw err;
        }
    },

    async actualizarEstado(
        id: string,
        nuevo_estado: string,
        motivo?: string,
        observacion?: string
      ){
        try {
            const res = await axiosWithAuth.patch(`/solicitudes/${id}/estado`, {
              nuevo_estado,
              motivo,
              observacion,
            });
            return res.data;
          } catch (err) {
            logger.error("❌ Error actualizando estado de solicitud", err);
            throw err;
          }
    },
    async calificarUsuario({
        solicitud_id,
        calificacion,
        observacion,
      }: {
        solicitud_id: string;
        calificacion: number;
        observacion?: string;
      }) {
        try {
          const res = await axiosWithAuth.post("/calificaciones/", {
            solicitud_id,
            calificacion,
            observacion,
          });
          return res.data;
        } catch (error) {
          logger.error("❌ Error al calificar usuario", error);
          throw error;
        }
      },
    
    

};


