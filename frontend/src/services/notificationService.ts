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
  }
};
