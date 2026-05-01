import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { AdminSolicitud, AdminSolicitudInteraccion, adminService } from "../../services/adminService";
import { useTranslation } from "react-i18next";

interface SolicitudInteractionViewerProps {
  solicitudId: string;
}

const SolicitudInteractionViewer: React.FC<SolicitudInteractionViewerProps> = ({ solicitudId }) => {
  const { t } = useTranslation();
  const [solicitud, setSolicitud] = useState<AdminSolicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminMessage, setAdminMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchSolicitud = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSolicitud(solicitudId);
      setSolicitud(data);
    } catch (err) {
      logger.error("Interactions load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return;
    setSending(true);
    try {
      await adminService.addAdminMessageToSolicitud(solicitudId, adminMessage.trim());
      setAdminMessage("");
      // Refresh interactions
      fetchSolicitud();
    } catch (err) {
      logger.error("Interactions post error", err);
      alert("Error al enviar mensaje de administrador.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-white rounded-lg shadow border border-blueGray-200">
        <i className="fas fa-spinner fa-spin text-3xl text-green-600"></i>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-white rounded-lg shadow border border-blueGray-200">
        <p className="text-blueGray-500">No se pudo cargar la solicitud.</p>
      </div>
    );
  }

  const getParticipantHeader = () => {
    if (solicitud?.participantDetails && solicitud.participantDetails.length > 0) {
      return solicitud.participantDetails.map(p => `${p.nombre} (${p.tipo}) - ${p.email || 'Sin email'}`).join(" — ");
    }
    return [solicitud.solicitante_id, solicitud.profesional_id].filter(Boolean).join(" — ") || "Sin participantes";
  };

  const getSenderName = (authorId: string, tipo?: string) => {
    if (tipo === "admin" || authorId.includes("admin")) return "Administrador (Sistema)";
    
    if (!solicitud?.participantDetails) return authorId;
    const p = solicitud.participantDetails.find(p => p.id === authorId);
    if (!p) return authorId;
    
    const tipoLabel = p.tipo ? (p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)) : 'Desconocido';
    return `${p.nombre || 'Desconocido'} (${tipoLabel})`;
  };

  const getMessageBubbleClasses = (tipo?: string, authorId?: string) => {
    if (tipo === "admin" || authorId?.includes("admin")) {
      return "bg-gray-800 text-white self-center text-center max-w-[90%] border-2 border-gray-600";
    }
    const isClient = authorId === solicitud.solicitante_id;
    if (isClient) {
      return "bg-white self-start max-w-[80%] rounded-tl-none border border-gray-200";
    }
    return "bg-[#dcf8c6] self-end max-w-[80%] rounded-tr-none border border-green-200";
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow border border-blueGray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-blueGray-50 border-b border-blueGray-200 relative">
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-bold text-blueGray-400 uppercase tracking-widest flex items-center gap-2">
            Solicitud ID: <span className="text-blueGray-600 bg-white px-2 py-0.5 rounded border border-blueGray-200 user-select-all">{solicitud.id}</span>
          </div>
          {solicitud.fecha_creacion && (
            <div className="text-[10px] uppercase font-bold text-blueGray-400">
              Creada: {new Date(solicitud.fecha_creacion).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="text-sm text-blueGray-700 flex flex-col gap-1 mb-2">
          <strong>Participantes:</strong>
          <span className="text-xs break-words whitespace-pre-wrap leading-relaxed">{getParticipantHeader()}</span>
        </div>
        <div className="text-sm font-bold text-blueGray-600 mb-1">
          Estado actual: <span className="uppercase bg-blueGray-200 px-2 py-1 rounded text-xs">{solicitud.estado}</span>
        </div>
        <div className="text-sm text-blueGray-700">
          <strong>Subcategoría:</strong> {solicitud.subcategoria || "-"} | <strong>Zona:</strong> {solicitud.zona || "-"}
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 px-4 py-4 overflow-y-auto bg-[#e5ddd5]">
        {(() => {
          const allMessages: AdminSolicitudInteraccion[] = [];
          if (solicitud.descripcion) {
            allMessages.push({
              mensaje: solicitud.descripcion,
              usuario_id: solicitud.solicitante_id,
              tipo: "cliente",
              fecha: solicitud.fecha_creacion
            });
          }
          if (solicitud.historial_consultas) {
            allMessages.push(...solicitud.historial_consultas);
          }

          if (allMessages.length === 0) {
            return (
              <div className="text-center text-sm text-blueGray-500 mt-10">
                No hay interacciones en esta solicitud.
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-3">
              {allMessages
                .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                .map((msg: AdminSolicitudInteraccion, index: number) => {
              const isAdmin = msg.tipo === "admin" || String(msg.autor_id).includes("admin");
              const bubbleClasses = getMessageBubbleClasses(msg.tipo, msg.autor_id || msg.usuario_id);
              
              return (
                <div key={index} className={`flex flex-col ${bubbleClasses} p-3 rounded-lg shadow-sm`}>
                  <div className={`text-[11px] font-bold mb-1 border-b pb-1 ${isAdmin ? "text-gray-300 border-gray-600" : "text-blueGray-600 border-black/5"}`}>
                    {isAdmin && <i className="fas fa-shield-alt mr-1"></i>}
                    {getSenderName(msg.autor_id || msg.usuario_id, msg.tipo)}
                  </div>
                  <div className={`text-sm break-words whitespace-pre-wrap mt-1 ${isAdmin ? "text-white" : "text-blueGray-800"}`}>
                    {msg.mensaje}
                  </div>
                  {msg.fecha && (
                    <div className={`text-[10px] text-right mt-1 ${isAdmin ? "text-gray-400" : "text-blueGray-400"}`}>
                      {new Date(msg.fecha).toLocaleDateString()} {new Date(msg.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
      
      {/* Admin Message Input Footer */}
      <div className="p-3 bg-blueGray-100 border-t border-blueGray-300 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
          placeholder="Escribir mensaje como administrador..."
          value={adminMessage}
          onChange={(e) => setAdminMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          disabled={sending}
        />
        <button
          onClick={handleSendMessage}
          disabled={sending || !adminMessage.trim()}
          className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane mr-2"></i>}
          Enviar Info Admin
        </button>
      </div>
    </div>
  );
};

export default SolicitudInteractionViewer;
