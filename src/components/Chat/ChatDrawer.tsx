import { logger } from "../../utils/logger";
import React, { useEffect, useState } from 'react';
import { chatService } from '../../services/chatService';
import { useChatContext } from '../../context/ChatContext';
import { useTranslation } from "react-i18next";
import { auth } from "../../firebase";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfessionalId?: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, initialProfessionalId }) => {
  const { chats, reload } = useChatContext();
  const [message, setMessage] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const { t } = useTranslation();

  const loadMessages = async (chatId: string) => {
    logger.info("CARGANDO MENSAJES con LOAD MESSAGES");
    try {
      const data = await chatService.getMessages(chatId);
      setMessages(data);
      setMessagesLoaded(true);
    } catch (error) {
      logger.error("Error cargando mensajes:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // refresca la lista de chats cada vez que abro el chat
      logger.info('🌀 Abriendo ChatDrawer, recargando chats');
      void reload();
    }
  }, [isOpen, reload]);

  useEffect(() => {
    logger.info("useEffect con initialProfessionalId: "+initialProfessionalId+" y chats: "+chats+" y activeChatId: "+activeChatId);		
    if (!initialProfessionalId || !chats.length || activeChatId) return;
    logger.info("🔍 Buscando en chats:", chats);
    const existing = chats.find(c =>
      c.participants.includes(initialProfessionalId)
    );
    if (existing) {
      logger.info("✅ Encontré el chat:", existing);
      setActiveChatId(existing.id);
    } else {
      logger.info("⚠️ No encontré un chat con ese participante");
    }
  
  }, [initialProfessionalId, chats, activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    logger.info("📨 Cargando mensajes del chat", activeChatId);
    loadMessages(activeChatId);
  }, [activeChatId]);


  const startChat = async () => {
    logger.info("START CHAT!");
    if (!initialProfessionalId || !message) return;
    const chatId = await chatService.contactProfessional(
      initialProfessionalId,
      message
    );
    logger.info("START CHAT: "+chatId);
    setActiveChatId(chatId);
    setMessage("");
    await reload(); // refresca la lista de chats para que incluya este nuevo
  };

  const sendMessage = async () => {
    logger.info("SEND MESSAGE!");
    if (!activeChatId || !message) return;
    await chatService.sendMessage(activeChatId, message);
    await loadMessages(activeChatId);
    reload();
    setMessage('');
  };

  const getOtherParticipantName = (chat: { participants_details: { uid: string, nombre: string }[] }) => {
    logger.info("auth.currentUser?.uid:", auth.currentUser?.uid);
    logger.info("chat.participants_details:", chat.participants_details);
    return chat.participants_details
      .filter((u) => u.uid !== auth.currentUser?.uid)
      .map((u) => u.nombre)
      .join(', ');
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg flex flex-col z-50" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">{t("chats")}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {!activeChatId && chats.map(chat => (
            <div
              key={chat.id}
              className={`p-2 mb-2 cursor-pointer rounded ${activeChatId === chat.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              onClick={() => setActiveChatId(chat.id)}
            >
              <div className="font-medium">{getOtherParticipantName(chat)}</div>
              <div className="text-sm text-gray-500">{chat.lastMessageSenderId === auth.currentUser?.uid ? `${t("vos")}: ${chat.lastMessage}` : chat.lastMessage || t("sin_mensajes")}</div>
            </div>
          ))}

          {activeChatId && messagesLoaded ? (
            messages.length > 0 ? (
              <div className="mb-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`mb-1 p-2 rounded ${msg.senderId === auth.currentUser?.uid ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}>
                    {msg.body}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">{t("sin_mensajes_aun")}</div>
            )
          ) : (
            <div className="text-center text-gray-400 py-4">{t("cargando_mensajes")}</div>
          )}
        </main>

        <footer className="p-4 border-t">
          <textarea
            className="w-full h-16 border rounded p-2 mb-2"
            placeholder={t("escribir_mensaje")}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <button
            onClick={activeChatId ? sendMessage : startChat}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {activeChatId ? t("enviar") : t("iniciar_chat")}
          </button>
        </footer>
      </div>
    </div>
  );
};
