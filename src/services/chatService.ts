import axios from "../utils/axiosWithAuth"; // o donde lo hayas guardado


const baseUrl = import.meta.env.VITE_API_URL;

export const chatService = {
  async contactProfessional(professional_id: string, message: string) {
    const res = await axios.post(`${baseUrl}/contactos/`, {
      professional_id,
      message,
    });
    return res.data.chatId;
  },
  async fetchChats() {
    console.log("FETCHING CHATS");
    const res = await axios.get(`${baseUrl}/chats`);
    return res.data;
  },
  async sendMessage(chatId: string, body: string) {
    const res = await axios.post(`${baseUrl}/chats/${chatId}/mensajes`, { body });
    return res.data;
  },
  getMessages(chatId: string) {
    return axios.get(`${baseUrl}/chats/${chatId}/mensajes`).then(res => res.data);
  },
  async fetchMessages(chatId: string) {
    const res = await axios.get(`${baseUrl}/chats/${chatId}/mensajes`);
    return res.data;
  }
  
  
};
