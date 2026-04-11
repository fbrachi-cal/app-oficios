import { logger } from "../../utils/logger";
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
      .catch(err => logger.error(err))
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

  const getParticipantHeader = () => {
    if (chat?.participantDetails && chat.participantDetails.length > 0) {
      return chat.participantDetails.map(p => `${p.nombre} (${p.tipo}) - ${p.email || 'Sin email'}`).join(" — ");
    }
    return chat?.participants?.join(" — ") || "Sin participantes";
  };

  const getSenderName = (uid: string) => {
    if (!chat?.participantDetails) return uid;
    const p = chat.participantDetails.find(p => p.id === uid);
    if (!p) return uid;
    const tipoLabel = p.tipo ? (p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)) : 'Desconocido';
    return `${p.nombre || 'Desconocido'} (${tipoLabel})`;
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow border border-blueGray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-blueGray-50 border-b border-blueGray-200 relative">
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-bold text-blueGray-400 uppercase tracking-widest flex items-center gap-2">
            Chat ID: <span className="text-blueGray-600 bg-white px-2 py-0.5 rounded border border-blueGray-200 user-select-all">{chat.id}</span>
          </div>
          {chat.createdAt && (
            <div className="text-[10px] uppercase font-bold text-blueGray-400">
              Creado: {new Date(chat.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="text-sm text-blueGray-700 flex flex-col gap-1">
          <strong>Participantes:</strong>
          <span className="text-xs break-words whitespace-pre-wrap leading-relaxed">{getParticipantHeader()}</span>
        </div>
        {chat.is_reported && (
          <div className="absolute top-4 right-4 bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-1 rounded uppercase">
            <i className="fas fa-exclamation-triangle mr-1"></i> Reportado
          </div>
        )}
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
                    <div className="text-[11px] text-blueGray-600 font-bold mb-1 border-b border-black/5 pb-1">
                      {getSenderName(msg.senderId)}
                    </div>
                    <div className="text-sm text-blueGray-800 break-words whitespace-pre-wrap mt-1">
                      {msg.body}
                    </div>
                    {msg.sentAt && (
                      <div className="text-[10px] text-blueGray-400 text-right mt-1">
                        {new Date(msg.sentAt).toLocaleDateString()} {new Date(msg.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
