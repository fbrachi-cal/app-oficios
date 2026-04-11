import { logger } from "../../utils/logger";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Report, adminService } from "../../services/adminService";

const ReportsPage = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [cursorQueue, setCursorQueue] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchReports = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getReports({
        limit: 15,
        status: statusFilter || undefined,
        start_after_id: cursor,
      });
      setReports(data.items);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      logger.error("Error loading reports", err);
      alert(t("admin.messages.fetch_error", "Error cargando reportes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursorQueue([]);
    setCurrentCursor(undefined);
    fetchReports(undefined);
  }, [statusFilter]);

  const handleNext = () => {
    if (nextCursor) {
      setCursorQueue((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(nextCursor);
      fetchReports(nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorQueue.length > 0) {
      const newQueue = [...cursorQueue];
      const prev = newQueue.pop();
      const actualCursor = prev === "" ? undefined : prev;
      setCursorQueue(newQueue);
      setCurrentCursor(actualCursor);
      fetchReports(actualCursor);
    }
  };

  const handleResolve = async (reportId: string) => {
    const notes = window.prompt(t("admin.reports.resolution_prompt", "Notas de resolución (opcional):"));
    if (notes === null) return; // User cancelled

    setResolvingId(reportId);
    try {
      const updated = await adminService.patchReport(reportId, {
        status: "resolved",
        resolution_notes: notes || undefined,
      });
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      alert(t("admin.messages.report_resolved", "Reporte resuelto"));
    } catch (err) {
      logger.error("Error processing report", err);
      alert(t("admin.messages.error", "Error al resolver reporte"));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow border border-blueGray-200">
        <h2 className="text-2xl font-bold text-blueGray-800 mb-4">
          {t("admin.reports.title", "Gestión de Reportes")}
        </h2>
        <div className="flex flex-wrap gap-4">
          <select
            className="border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm py-2 px-3 min-w-[200px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t("admin.filters.all_status", "Todos los estados")}</option>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltos</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <i className="fas fa-circle-notch fa-spin text-4xl text-green-600"></i>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-blueGray-200">
          <table className="min-w-full text-left text-sm text-blueGray-600">
            <thead className="bg-blueGray-50 text-blueGray-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Detalle</th>
                <th className="px-6 py-4">Reportado Por</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blueGray-200">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-blueGray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold font-mono">
                    {r.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 min-w-[250px]">
                    <div className="flex gap-2 mb-1">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                        r.target_type === 'user' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {r.target_type === 'user' ? 'Usuario' : 'Mensaje'}
                      </span>
                      <span className="text-xs text-blueGray-400 my-auto">
                        ID: {r.target_id}
                      </span>
                    </div>
                    <div className="font-medium text-blueGray-800 break-words line-clamp-2" title={r.reason}>
                      {r.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-blueGray-800 break-all">{r.reporter_uid}</div>
                    <div className="text-[10px] text-blueGray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {r.status === 'pending' ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full inline-flex items-center gap-1">
                        <i className="fas fa-clock"></i> Pendiente
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full inline-flex items-center gap-1 w-max">
                          <i className="fas fa-check"></i> Resuelto
                        </span>
                        {r.resolved_by && (
                          <span className="text-[10px] text-blueGray-400">
                            por: {r.resolved_by.substring(0,6)}...
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {r.status === 'pending' ? (
                      <button 
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow disabled:opacity-50 transition-colors"
                        onClick={() => handleResolve(r.id)}
                        disabled={resolvingId === r.id}
                      >
                        {resolvingId === r.id ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          t("admin.actions.resolve", "Resolver")
                        )}
                      </button>
                    ) : (
                      <button 
                        className="text-blueGray-400 hover:text-blueGray-600"
                        title={r.resolved_notes || "Sin notas adicionales"}
                        onClick={() => alert(r.resolved_notes || "Cerrado sin notas adicionales.")}
                      >
                        <i className="fas fa-info-circle text-lg"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-blueGray-400">
                     {t("admin.table.no_results", "No se encontraron reportes")}
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center py-4">
        <button
          onClick={handlePrev}
          disabled={cursorQueue.length === 0 || loading}
          className="px-4 py-2 bg-white border border-blueGray-300 text-blueGray-600 rounded shadow-sm hover:bg-blueGray-50 disabled:opacity-50 font-bold text-sm"
        >
          <i className="fas fa-chevron-left mr-2" />
          {t("admin.pagination.prev", "Anterior")}
        </button>
        <span className="text-sm font-medium text-blueGray-500">
          {t("admin.pagination.current_page", "Página actual")} {cursorQueue.length + 1}
        </span>
        <button
          onClick={handleNext}
          disabled={!nextCursor || loading}
          className="px-4 py-2 bg-white border border-blueGray-300 text-blueGray-600 rounded shadow-sm hover:bg-blueGray-50 disabled:opacity-50 font-bold text-sm"
        >
          {t("admin.pagination.next", "Siguiente")}
          <i className="fas fa-chevron-right ml-2" />
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
