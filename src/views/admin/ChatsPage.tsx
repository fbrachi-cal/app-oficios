import { logger } from "../../utils/logger";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminChat, adminService } from "../../services/adminService";
import ChatViewer from "../../components/admin/ChatViewer";

const ChatsPage = () => {
  const { t } = useTranslation();
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [searchUid, setSearchUid] = useState("");
  const [cursorQueue, setCursorQueue] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const fetchChats = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getChats({
        limit: 15,
        start_after_id: cursor,
        search_uid: searchUid || undefined,
      });
      setChats(data.items);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      logger.error(err);
      alert(t("admin.messages.fetch_error", "Error cargando chats"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursorQueue([]);
    setCurrentCursor(undefined);
    fetchChats(undefined);
  }, [searchUid]);

  const handleNext = () => {
    if (nextCursor) {
      setCursorQueue((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(nextCursor);
      fetchChats(nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorQueue.length > 0) {
      const newQueue = [...cursorQueue];
      const prev = newQueue.pop();
      const actualCursor = prev === "" ? undefined : prev;
      setCursorQueue(newQueue);
      setCurrentCursor(actualCursor);
      fetchChats(actualCursor);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow border border-blueGray-200">
        <h2 className="text-2xl font-bold text-blueGray-800 mb-4">
          {t("admin.chats.title", "Moderación de Chats")}
        </h2>
        <div className="max-w-md relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blueGray-400">
            <i className="fas fa-search" />
          </span>
          <input
            type="text"
            placeholder={t("admin.chats.search", "Buscar por UID de participante...")}
            className="w-full pl-10 pr-4 py-2 border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-row gap-6 items-start">
        {/* Left Column: List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] flex flex-col gap-4">
          <div className="bg-white shadow rounded-lg border border-blueGray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-blueGray-400">Cargando...</div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-blueGray-400">No hay chats.</div>
            ) : (
              <ul className="divide-y divide-blueGray-100 max-h-[600px] overflow-y-auto">
                {chats.map((c) => (
                  <li
                    key={c.id}
                    className={`p-4 cursor-pointer hover:bg-blueGray-50 transition-colors ${
                      selectedChatId === c.id ? "bg-green-50 border-l-4 border-green-500" : ""
                    }`}
                    onClick={() => setSelectedChatId(c.id)}
                  >
                    <div className="text-xs font-bold text-blueGray-800 mb-1">
                      ID: {c.id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-blueGray-500 truncate mb-2">
                      {c.participants?.join(", ") || "Sin participantes"}
                    </div>
                    <div className="text-xs text-blueGray-400 flex justify-between">
                      <span className="truncate max-w-[70%]">
                        {c.lastMessage || "Sin mensajes"}
                      </span>
                      <span>
                        {c.lastMessageAt && new Date(c.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={cursorQueue.length === 0 || loading}
              className="text-xs font-bold text-blueGray-600 disabled:opacity-50"
            >
              <i className="fas fa-chevron-left mr-1" /> Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!nextCursor || loading}
              className="text-xs font-bold text-blueGray-600 disabled:opacity-50"
            >
              Siguiente <i className="fas fa-chevron-right ml-1" />
            </button>
          </div>
        </div>

        {/* Right Column: Viewer */}
        <div className="flex-1">
          {selectedChatId ? (
            <ChatViewer chatId={selectedChatId} />
          ) : (
            <div className="h-full flex items-center justify-center bg-transparent border-2 border-dashed border-blueGray-300 rounded-lg p-12 text-blueGray-400 text-center">
              <div>
                <i className="fas fa-comments text-4xl mb-4 opacity-50 block"></i>
                Seleccioná un chat de la lista<br />para ver los mensajes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;
