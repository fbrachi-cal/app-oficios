/**
 * Admin-specific API service.
 * Uses the shared axiosWithAuth instance (auto-attaches Firebase Bearer token).
 * All functions are strictly typed to match backend DTOs.
 */
import axios from "../utils/axiosWithAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  nombre: string;
  tipo: string;
  is_active: boolean;
  deleted_at?: string | null;
  foto?: string;
  descripcion?: string;
  zonas?: string[];
  categorias?: string[];
  updated_by?: string;
  updated_at?: string;
};

export type AdminUserPatch = {
  tipo?: string;
  is_active?: boolean;
  deleted_at?: string | null;
};

export type AdminChat = {
  id: string;
  participants: string[];
  participantDetails?: {
    id: string;
    nombre: string;
    tipo: string;
    email?: string;
  }[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt?: string;
  is_reported?: boolean;
  messages?: AdminMessage[];
};

export type AdminMessage = {
  id: string;
  senderId: string;
  body: string;
  sentAt?: string;
};

export type Report = {
  id: string;
  reporter_uid: string;
  target_type: "user" | "message";
  target_id: string;
  reason: string;
  status: "pending" | "resolved";
  created_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolved_notes?: string | null;
};

export type AdminSolicitudInteraccion = {
  mensaje: string;
  usuario_id: string;
  rol?: string;
  autor_id?: string;
  fecha: string;
};

export type AdminSolicitud = {
  id: string;
  solicitante_id: string;
  profesional_id?: string;
  estado: string;
  fecha_creacion: string;
  historial_consultas?: AdminSolicitudInteraccion[];
  participantDetails?: {
    id: string;
    nombre: string;
    tipo: string;
    email?: string;
  }[];
};

export type AdminRating = {
  id: string;
  solicitud_id?: string;
  calificador_id: string;
  calificado_id: string;
  calificacion: number;
  observacion?: string;
  fecha: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  created_by?: string;
  updated_by?: string;
  deleted_by?: string | null;
};

export type AdminRatingCreate = {
  solicitud_id?: string;
  calificador_id: string;
  calificado_id: string;
  calificacion: number;
  observacion?: string;
};

export type AdminRatingUpdate = {
  calificacion?: number;
  observacion?: string;
};

export type ReportCreate = {
  target_type: "user" | "message";
  target_id: string;
  reason: string;
};

export type ReportPatch = {
  status?: "pending" | "resolved";
  resolution_notes?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  next_cursor?: string | null;
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const adminService = {
  // Users
  async getUsers(params?: {
    limit?: number;
    start_after_id?: string;
    search?: string;
    role?: string;
  }): Promise<PaginatedResponse<AdminUser>> {
    const res = await axios.get(`/admin/users`, { params });
    return res.data;
  },

  async getUser(uid: string): Promise<AdminUser> {
    const res = await axios.get(`/admin/users/${uid}`);
    return res.data;
  },

  async patchUser(uid: string, data: AdminUserPatch): Promise<AdminUser> {
    const res = await axios.patch(`/admin/users/${uid}`, data);
    return res.data;
  },

  // Chats
  async getChats(params?: {
    limit?: number;
    start_after_id?: string;
    search_uid?: string;
  }): Promise<PaginatedResponse<AdminChat>> {
    const res = await axios.get(`/admin/chats`, { params });
    return res.data;
  },

  async getChat(chatId: string): Promise<AdminChat> {
    const res = await axios.get(`/admin/chats/${chatId}`);
    return res.data;
  },

  // Reports (admin side)
  async getReports(params?: {
    status?: string;
    limit?: number;
    start_after_id?: string;
  }): Promise<PaginatedResponse<Report>> {
    const res = await axios.get(`/admin/reports`, { params });
    return res.data;
  },

  async patchReport(reportId: string, data: ReportPatch): Promise<Report> {
    const res = await axios.patch(`/admin/reports/${reportId}`, data);
    return res.data;
  },

  // Reports (user-facing — any authenticated user)
  async createReport(data: ReportCreate): Promise<{ id: string; message: string }> {
    const res = await axios.post(`/reports`, data);
    return res.data;
  },

  // Ratings (Admin)
  async getRatings(params?: {
    status?: string;
    limit?: number;
    start_after_id?: string;
  }) {
    // We omit PaginatedResponse<AdminRating> type internally to allow implicit any or matching later
    const res = await axios.get<{ items?: AdminRating[]; total?: number; start_after_id?: string; next_cursor?: string } | AdminRating[]>(`/admin/calificaciones`, { params });
    // Note: Python backend returns List[dict] currently, not inside `{items: ...}`. Let's adapt if needed.
    // Wait, the python list_ratings logic returns `List[dict]`. It doesn't wrap in `items`.
    // I will return res.data.
    return res.data;
  },

  async getRating(ratingId: string): Promise<AdminRating> {
    const res = await axios.get(`/admin/calificaciones/${ratingId}`);
    return res.data;
  },

  async createRating(data: AdminRatingCreate): Promise<{ id: string; message: string }> {
    const res = await axios.post(`/admin/calificaciones`, data);
    return res.data;
  },

  async patchRating(ratingId: string, data: AdminRatingUpdate): Promise<{ id: string; message: string }> {
    const res = await axios.patch(`/admin/calificaciones/${ratingId}`, data);
    return res.data;
  },

  async deleteRating(ratingId: string): Promise<{ id: string; message: string }> {
    const res = await axios.delete(`/admin/calificaciones/${ratingId}`);
    return res.data;
  },

  // Solicitudes (with interactions)
  async getSolicitudes(params?: {
    limit?: number;
    start_after_id?: string;
  }): Promise<PaginatedResponse<AdminSolicitud>> {
    const res = await axios.get(`/admin/solicitudes`, { params });
    return res.data;
  },

  async getSolicitud(solicitudId: string): Promise<AdminSolicitud> {
    const res = await axios.get(`/admin/solicitudes/${solicitudId}`);
    return res.data;
  },

  async addAdminMessageToSolicitud(solicitudId: string, mensaje: string): Promise<{ id: string; message: string }> {
    const res = await axios.post(`/admin/solicitudes/${solicitudId}/mensajes`, { mensaje });
    return res.data;
  },
};
