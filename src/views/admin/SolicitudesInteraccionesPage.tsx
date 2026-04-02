import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminSolicitud, adminService } from "../../services/adminService";
import SolicitudInteractionViewer from "../../components/admin/SolicitudInteractionViewer";

const SolicitudesInteraccionesPage = () => {
  const { t } = useTranslation();
  const [solicitudes, setSolicitudes] = useState<AdminSolicitud[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [cursorQueue, setCursorQueue] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null);

  const fetchSolicitudes = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getSolicitudes({
        limit: 15,
        start_after_id: cursor,
      });
      setSolicitudes(data.items);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      console.error(err);
      alert("Error cargando solicitudes con interacciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes(undefined);
  }, []);

  const handleNext = () => {
    if (nextCursor) {
      setCursorQueue((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(nextCursor);
      fetchSolicitudes(nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorQueue.length > 0) {
      const newQueue = [...cursorQueue];
      const prev = newQueue.pop();
      const actualCursor = prev === "" ? undefined : prev;
      setCursorQueue(newQueue);
      setCurrentCursor(actualCursor);
      fetchSolicitudes(actualCursor);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow border border-blueGray-200">
        <h2 className="text-2xl font-bold text-blueGray-800 mb-2">
          {t("admin.solicitudes_interacciones.title", "Interacciones en Solicitudes")}
        </h2>
        <p className="text-blueGray-500 text-sm">
          Este panel permite inspeccionar y enviar mensajes dentro de las consultas de las solicitudes. (Distinto de Chat Directo)
        </p>
      </div>

      <div className="flex flex-row gap-6 items-start">
        {/* Left Column: List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] flex flex-col gap-4">
          <div className="bg-white shadow rounded-lg border border-blueGray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-blueGray-400">Cargando...</div>
            ) : solicitudes.length === 0 ? (
              <div className="p-8 text-center text-blueGray-400">No hay solicitudes con interacciones.</div>
            ) : (
              <ul className="divide-y divide-blueGray-100 max-h-[600px] overflow-y-auto">
                {solicitudes.map((s) => (
                  <li
                    key={s.id}
                    className={`p-4 cursor-pointer hover:bg-blueGray-50 transition-colors ${
                      selectedSolicitudId === s.id ? "bg-green-50 border-l-4 border-green-500" : ""
                    }`}
                    onClick={() => setSelectedSolicitudId(s.id)}
                  >
                    <div className="text-xs font-bold text-blueGray-800 mb-1 flex justify-between">
                      <span>ID: {s.id.substring(0, 8)}...</span>
                      <span className="text-[10px] bg-blueGray-200 px-2 rounded uppercase">{s.estado}</span>
                    </div>
                    <div className="text-sm text-blueGray-500 truncate mb-1">
                      CLI: {s.solicitante_id.substring(0,6)}... | PRO: {s.profesional_id ? s.profesional_id.substring(0,6) + "..." : "N/A"}
                    </div>
                    <div className="text-xs text-blueGray-400 mt-2 font-semibold">
                      {s.historial_consultas?.length} interacciones registradas
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
          {selectedSolicitudId ? (
            <SolicitudInteractionViewer solicitudId={selectedSolicitudId} />
          ) : (
            <div className="h-full flex items-center justify-center bg-transparent border-2 border-dashed border-blueGray-300 rounded-lg p-12 text-blueGray-400 text-center">
              <div>
                <i className="fas fa-inbox text-4xl mb-4 opacity-50 block"></i>
                Seleccioná una solicitud de la lista<br />para ver las interacciones.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitudesInteraccionesPage;
