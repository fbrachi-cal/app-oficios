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
  resolution_notes?: string | null;
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
};
