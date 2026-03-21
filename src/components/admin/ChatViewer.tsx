import React, { useEffect, useState } from "react";
import { AdminChat, AdminMessage, adminService } from "../../services/adminService";
import { useTranslation } from "react-i18next";

interface ChatViewerProps {
  chatId: string;
}

const ChatViewer: React.FC<ChatViewerProps> = ({ chatId }) => {
  const { t } = useTranslation();
  const [chat, setChat] = useState<AdminChat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminService.getChat(chatId)
      .then(data => {
        if (active) setChat(data);
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [chatId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-white rounded-lg shadow border border-blueGray-200">
        <i className="fas fa-spinner fa-spin text-3xl text-green-600"></i>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-white rounded-lg shadow border border-blueGray-200">
        <p className="text-blueGray-500">No se pudo cargar el chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow border border-blueGray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-blueGray-50 border-b border-blueGray-200">
        <div className="text-xs font-bold text-blueGray-400 uppercase tracking-widest mb-1">
          Chat ID: {chat.id}
        </div>
        <div className="text-sm text-blueGray-700 flex gap-2">
          <strong>Participantes:</strong>
          <span className="truncate">{chat.participants?.join(" — ") || "Sin participantes"}</span>
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 px-4 py-4 overflow-y-auto bg-[#e5ddd5]">
        {chat.messages && chat.messages.length > 0 ? (
          <div className="flex flex-col gap-3">
            {chat.messages.map((msg: AdminMessage) => {
              // Quick heurist: check if sender is the first participant just for alignment
              const isFirstParticipant = msg.senderId === chat.participants?.[0];
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[80%] ${isFirstParticipant ? "self-end" : "self-start"}`}
                >
                  <div className={`p-3 rounded-lg shadow-sm ${isFirstParticipant ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                    <div className="text-[10px] text-blueGray-500 font-bold mb-1 opacity-70">
                      {msg.senderId}
                    </div>
                    <div className="text-sm text-blueGray-800 break-words">
                      {msg.body}
                    </div>
                    {msg.sentAt && (
                      <div className="text-[10px] text-blueGray-400 text-right mt-1">
                        {new Date(msg.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-sm text-blueGray-500 mt-10">
            No hay mensajes en este chat.
          </div>
        )}
      </div>
      
      {/* Readonly Footer */}
      <div className="p-3 bg-blueGray-100 text-center text-xs text-blueGray-500">
        <i className="fas fa-eye mr-2"></i>
        {t("admin.chat.readonly", "Vista de solo lectura (Moderación)")}
      </div>
    </div>
  );
};

export default ChatViewer;
