import { logger } from "../../utils/logger";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminUser, adminService } from "../../services/adminService";
import UserTable from "../../components/admin/UserTable";
import UserDetailModal from "../../components/admin/UserDetailModal";

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [cursorQueue, setCursorQueue] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetchUsers = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        limit: 15,
        start_after_id: cursor,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.items);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      logger.error("Error loading users", err);
      alert(t("admin.messages.fetch_error", "Error cargando usuarios"));
    } finally {
      setLoading(false);
    }
  };

  // Immediate fetch on mount or filter changes (resetting pagination)
  useEffect(() => {
    setCursorQueue([]);
    setCurrentCursor(undefined);
    fetchUsers(undefined);
  }, [search, roleFilter]);

  // Handle Paginate Next
  const handleNext = () => {
    if (nextCursor) {
      setCursorQueue((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(nextCursor);
      fetchUsers(nextCursor);
    }
  };

  // Handle Paginate Prev
  const handlePrev = () => {
    if (cursorQueue.length > 0) {
      const newQueue = [...cursorQueue];
      const prevCursorItem = newQueue.pop();
      const actualCursor = prevCursorItem === "" ? undefined : prevCursorItem;
      setCursorQueue(newQueue);
      setCurrentCursor(actualCursor);
      fetchUsers(actualCursor);
    }
  };

  // When a user is edited in the modal, update local state
  const handleUserUpdate = (updated: AdminUser) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-blueGray-200">
        <h2 className="text-2xl font-bold text-blueGray-800 mb-4">
          {t("admin.users.title", "Gestión de Usuarios")}
        </h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blueGray-400">
              <i className="fas fa-search" />
            </span>
            <input
              type="text"
              placeholder={t("admin.users.search", "Buscar por nombre, email o ID...")}
              className="w-full pl-10 pr-4 py-2 border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm py-2 px-3"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t("admin.filters.all_roles", "Todos los roles")}</option>
            <option value="cliente">Cliente</option>
            <option value="profesional">Profesional</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <i className="fas fa-circle-notch fa-spin text-4xl text-green-600"></i>
        </div>
      ) : (
        <UserTable users={users} onRowClick={setSelectedUser} />
      )}

      {/* Pagination Controls */}
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

      {/* Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserChange={handleUserUpdate}
      />
    </div>
  );
};

export default UsersPage;
