import { logger } from "../../utils/logger";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiPlusCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiStar,
} from "react-icons/fi";
import { AdminRating, adminService } from "../../services/adminService";

const RatingsPage = () => {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [cursorQueue, setCursorQueue] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRating, setEditingRating] = useState<AdminRating | null>(null);
  const [formCalificador, setFormCalificador] = useState("");
  const [formCalificado, setFormCalificado] = useState("");
  const [formScore, setFormScore] = useState(5);
  const [formObs, setFormObs] = useState("");
  const [formSolicitud, setFormSolicitud] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRatings = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getRatings({
        limit: 15,
        status: statusFilter || undefined,
        start_after_id: cursor,
      });
      const items = Array.isArray(data) ? data : (data as any).items ?? [];
      setRatings(items);
      setNextCursor(items.length === 15 ? items[14].id : null);
    } catch (err) {
      logger.error(err);
      alert(t("admin.messages.fetch_error", "Error cargando calificaciones"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursorQueue([]);
    setCurrentCursor(undefined);
    fetchRatings(undefined);
  }, [statusFilter]);

  const handleNext = () => {
    if (nextCursor) {
      setCursorQueue((prev) => [...prev, currentCursor ?? ""]);
      setCurrentCursor(nextCursor);
      fetchRatings(nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursorQueue.length > 0) {
      const newQueue = [...cursorQueue];
      const prev = newQueue.pop();
      const actualCursor = prev === "" ? undefined : prev;
      setCursorQueue(newQueue);
      setCurrentCursor(actualCursor);
      fetchRatings(actualCursor);
    }
  };

  const handleDelete = async (r: AdminRating) => {
    if (
      !window.confirm(
        t("admin.ratings.confirm_delete", "¿Seguro que querés eliminar (soft delete) esta calificación?")
      )
    )
      return;

    setActionId(r.id);
    try {
      await adminService.deleteRating(r.id);
      alert(t("admin.messages.success", "Operación exitosa"));
      fetchRatings(currentCursor);
    } catch (err) {
      logger.error(err);
      alert(t("admin.messages.error", "Error eliminando la calificación"));
    } finally {
      setActionId(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingRating(null);
    setFormCalificador("");
    setFormCalificado("");
    setFormScore(5);
    setFormObs("");
    setFormSolicitud("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: AdminRating) => {
    if (r.deleted_at) {
      alert(t("admin.ratings.cannot_edit_deleted", "No se puede editar una calificación eliminada."));
      return;
    }
    setEditingRating(r);
    setFormCalificador(r.calificador_id);
    setFormCalificado(r.calificado_id);
    setFormScore(r.calificacion);
    setFormObs(r.observacion ?? "");
    setFormSolicitud(r.solicitud_id ?? "");
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRating) {
        await adminService.patchRating(editingRating.id, {
          calificacion: Number(formScore),
          observacion: formObs || undefined,
        });
      } else {
        if (!formCalificador || !formCalificado) {
          alert("Calificador y Calificado son obligatorios.");
          setSaving(false);
          return;
        }
        await adminService.createRating({
          calificador_id: formCalificador,
          calificado_id: formCalificado,
          calificacion: Number(formScore),
          observacion: formObs || undefined,
          solicitud_id: formSolicitud || undefined,
        });
      }
      alert(t("admin.messages.success", "Operación exitosa"));
      setIsModalOpen(false);
      fetchRatings(currentCursor);
    } catch (err: any) {
      logger.error(err);
      alert(err.response?.data?.detail ?? t("admin.messages.error", "Ocurrió un error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow border border-blueGray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blueGray-800">
            {t("admin.ratings.title", "Gestión de Calificaciones")}
          </h2>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow font-bold hover:bg-green-700 transition"
          >
            <FiPlusCircle size={16} />
            Nuevo
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            className="border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm py-2 px-3 min-w-[200px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t("admin.filters.all", "Todas")}</option>
            <option value="active">Activas</option>
            <option value="deleted">Eliminadas</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <FiLoader size={40} className="animate-spin text-green-600" />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-blueGray-200">
          <table className="min-w-full text-left text-sm text-blueGray-600">
            <thead className="bg-blueGray-50 text-blueGray-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Detalle</th>
                <th className="px-6 py-4">Involucrados</th>
                <th className="px-6 py-4">Fecha / Audit</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blueGray-200">
              {ratings.map((r) => (
                <tr key={r.id} className="hover:bg-blueGray-50">
                  <td className="px-6 py-4 min-w-[250px]">
                    <div className="flex gap-2 mb-1">
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-full">
                        <FiStar size={10} />
                        {r.calificacion}
                      </span>
                      <span className="text-xs text-blueGray-400 font-mono my-auto">
                        ID: {r.id.substring(0, 8)}
                      </span>
                    </div>
                    <div
                      className="font-medium text-blueGray-800 break-words line-clamp-2"
                      title={r.observacion}
                    >
                      {r.observacion ?? (
                        <span className="text-gray-400 italic">Sin observación</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <div className="text-blueGray-800">
                      <span className="font-bold">De: </span>
                      {r.calificador_id.substring(0, 8)}
                    </div>
                    <div className="text-blueGray-800">
                      <span className="font-bold">A: </span>
                      {r.calificado_id.substring(0, 8)}
                    </div>
                    {r.solicitud_id && (
                      <div className="text-blueGray-400 text-[10px] mt-1">
                        Sol: {r.solicitud_id.substring(0, 8)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-semibold">
                      {new Date(r.created_at ?? r.fecha).toLocaleDateString()}
                    </div>
                    {r.deleted_by && (
                      <div className="text-[10px] text-red-500">
                        Del: {r.deleted_by.substring(0, 6)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!r.deleted_at ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full w-fit">
                        <FiCheckCircle size={12} /> Activa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full w-fit">
                        <FiXCircle size={12} /> Eliminada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        className="text-blue-500 hover:text-blue-700 disabled:opacity-30 transition-colors"
                        onClick={() => handleOpenEdit(r)}
                        disabled={!!r.deleted_at || actionId === r.id}
                        title="Editar"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      {!r.deleted_at && (
                        <button
                          className="text-red-500 hover:text-red-700 disabled:opacity-30 transition-colors"
                          onClick={() => handleDelete(r)}
                          disabled={actionId === r.id}
                          title="Eliminar"
                        >
                          {actionId === r.id ? (
                            <FiLoader size={16} className="animate-spin" />
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ratings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-blueGray-400">
                    No se encontraron calificaciones
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
          className="flex items-center gap-2 px-4 py-2 bg-white border border-blueGray-300 text-blueGray-600 rounded shadow-sm hover:bg-blueGray-50 disabled:opacity-40 font-bold text-sm"
        >
          <FiChevronLeft size={16} />
          Anterior
        </button>
        <span className="text-sm font-medium text-blueGray-500">
          Página {cursorQueue.length + 1}
        </span>
        <button
          onClick={handleNext}
          disabled={!nextCursor || loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-blueGray-300 text-blueGray-600 rounded shadow-sm hover:bg-blueGray-50 disabled:opacity-40 font-bold text-sm"
        >
          Siguiente
          <FiChevronRight size={16} />
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <h2 className="text-xl font-bold mb-4">
              {editingRating ? "Editar Calificación" : "Nueva Calificación"}
            </h2>
            <form onSubmit={handleSaveForm} className="flex flex-col gap-4">
              {!editingRating && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-1">ID Calificador</label>
                    <input
                      required
                      type="text"
                      className="border w-full p-2 rounded"
                      value={formCalificador}
                      onChange={(e) => setFormCalificador(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">ID Calificado</label>
                    <input
                      required
                      type="text"
                      className="border w-full p-2 rounded"
                      value={formCalificado}
                      onChange={(e) => setFormCalificado(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">ID Solicitud (Opcional)</label>
                    <input
                      type="text"
                      className="border w-full p-2 rounded"
                      value={formSolicitud}
                      onChange={(e) => setFormSolicitud(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold mb-1">Puntuación (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  required
                  className="border w-full p-2 rounded"
                  value={formScore}
                  onChange={(e) => setFormScore(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Observación</label>
                <textarea
                  className="border w-full p-2 rounded"
                  rows={3}
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded font-bold hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {saving && <FiLoader size={14} className="animate-spin" />}
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsPage;
