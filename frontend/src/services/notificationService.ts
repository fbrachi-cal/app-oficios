import axios from "../utils/axiosWithAuth";

export const notificationService = {
  async fetchNotifications() {
    const res = await axios.get("/notifications/me");
    return res.data;
  },

  async markAsRead(id: string) {
    const res = await axios.post(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await axios.post("/notifications/read-all");
    return res.data;
  },

  async registerFCMToken(token: string) {
    const res = await axios.post("/notifications/fcm-token", { token });
    return res.data;
  },

  async unregisterFCMToken(token: string) {
    const res = await axios.delete(`/notifications/fcm-token?token=${encodeURIComponent(token)}`);
    return res.data;
  },

  async registerPushToken(token: string, metadata?: { platform?: string, app_version?: string, device_id?: string, permission_status?: string, client_sequence?: number, installation_id?: string }) {
    const res = await axios.post("/notifications/devices", {
      token,
      platform: metadata?.platform || "android",
      app_version: metadata?.app_version,
      device_id: metadata?.device_id,
      permission_status: metadata?.permission_status,
      client_sequence: metadata?.client_sequence,
      installation_id: metadata?.installation_id
    });
    return res.data;
  },

  async deactivatePushToken(token: string) {
    const res = await axios.post("/notifications/devices/deactivate", { token });
    return res.data;
  }
};
