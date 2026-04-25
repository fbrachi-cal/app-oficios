import { logger } from "../../utils/logger";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminUser, AdminUserPatch, adminService } from "../../services/adminService";

interface UserDetailModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUserChange: (updatedUser: AdminUser) => void;
}

const ROLES = ["cliente", "profesional", "admin", "moderator"];
const STATUSES = ["ACTIVE", "SUSPENDED", "EXPELLED", "DEACTIVATED"];

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, isOpen, onClose, onUserChange }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // Local form state
  const [tipo, setTipo] = useState<string>("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [statusReason, setStatusReason] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    if (user) {
      setTipo(user.tipo || "cliente");
      setStatus(user.status || (user.is_active === false ? "SUSPENDED" : "ACTIVE"));
      setStatusReason(user.status_reason || "");
      setAdminNotes(user.admin_notes || "");
      setExpiresAt(user.status_expires_at ? new Date(user.status_expires_at).toISOString().slice(0, 16) : "");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isDeleted = !!user.deleted_at;

  const handleSave = async () => {
    setLoading(true);
    try {
      const patch: AdminUserPatch = {};
      if (tipo !== user.tipo) patch.tipo = tipo;
      
      const currentStatus = user.status || (user.is_active === false ? "SUSPENDED" : "ACTIVE");
      if (status !== currentStatus) patch.status = status;
      if (statusReason !== (user.status_reason || "")) patch.status_reason = statusReason;
      if (adminNotes !== (user.admin_notes || "")) patch.admin_notes = adminNotes;
      
      if (status === "SUSPENDED" && expiresAt) {
        patch.status_expires_at = new Date(expiresAt).toISOString();
      } else if (status === "SUSPENDED" && !expiresAt) {
        patch.status_expires_at = null; // Clear if emptied
      }
      
      if (patch.status && ["SUSPENDED", "EXPELLED", "DEACTIVATED"].includes(patch.status)) {
        if (!window.confirm(t("admin.messages.confirm_block", `¿Estás seguro de cambiar el estado a ${patch.status}? Esto impedirá que el usuario inicie sesión.`))) {
          setLoading(false);
          return;
        }
      }

      if (Object.keys(patch).length > 0) {
        const updated = await adminService.patchUser(user.id, patch);
        onUserChange(updated);
        alert(t("admin.messages.user_updated", "Usuario actualizado correctamente"));
      }
      onClose();
    } catch (err) {
      logger.error("User details error", err);
      alert(t("admin.messages.error", "Ocurrió un error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!window.confirm(t("admin.messages.confirm_delete", "¿Estás seguro de eliminar este usuario?"))) return;
    
    setLoading(true);
    try {
      const updated = await adminService.patchUser(user.id, {
        deleted_at: new Date().toISOString()
      });
      onUserChange(updated);
      alert(t("admin.messages.user_deleted", "Usuario eliminado (soft delete)"));
      onClose();
    } catch (err) {
      logger.error("User metrics error", err);
      alert(t("admin.messages.error", "Ocurrió un error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-blueGray-200 flex justify-between items-center bg-blueGray-50">
          <h3 className="text-lg font-bold text-blueGray-800">
            {t("admin.modal.user_detail", "Detalle de Usuario")}
          </h3>
          <button onClick={onClose} className="text-blueGray-400 hover:text-blueGray-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto">
          {/* Info Card */}
          <div className="flex items-center gap-4 mb-6 bg-blueGray-50 p-4 rounded-lg">
             <div className="w-16 h-16 rounded-full bg-blueGray-200 overflow-hidden flex-shrink-0">
               {user.foto ? (
                 <img src={user.foto} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 <i className="fas fa-user text-blueGray-400 m-auto mt-4 text-3xl block text-center" />
               )}
             </div>
             <div>
               <h4 className="font-bold text-lg text-blueGray-800">{user.nombre || "Sin nombre"}</h4>
               <p className="text-sm text-blueGray-500">{user.id}</p>
             </div>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Roles */}
            <div>
              <label className="block text-sm font-semibold text-blueGray-700 mb-2">
                {t("admin.modal.role", "Rol del usuario")}
              </label>
              <select 
                value={tipo} 
                onChange={e => setTipo(e.target.value)}
                disabled={isDeleted || loading}
                className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-blueGray-700 mb-2">
                {t("admin.modal.status", "Estado de acceso")}
              </label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                disabled={isDeleted || loading}
                className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                <option value="ACTIVE">{t("admin.status.active", "Activo")}</option>
                <option value="SUSPENDED">{t("admin.status.suspended", "Suspendido (Temporal)")}</option>
                <option value="EXPELLED">{t("admin.status.expelled", "Expulsado (Permanente)")}</option>
                <option value="DEACTIVATED">{t("admin.status.deactivated", "Desactivado (Lógico)")}</option>
              </select>
            </div>

            {/* Status Reason */}
            {status !== "ACTIVE" && (
              <div>
                <label className="block text-sm font-semibold text-blueGray-700 mb-2">
                  {t("admin.modal.status_reason", "Motivo (Visible para el usuario)")}
                </label>
                <textarea
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  disabled={isDeleted || loading}
                  className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Ej. Violación de términos de uso."
                  rows={2}
                ></textarea>
              </div>
            )}

            {/* Temporality (Only SUSPENDED) */}
            {status === "SUSPENDED" && (
              <div>
                <label className="block text-sm font-semibold text-blueGray-700 mb-2">
                  Expira el (Opcional, suspensión temporal)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  disabled={isDeleted || loading}
                  className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-semibold text-blueGray-700 mb-2">
                {t("admin.modal.admin_notes", "Notas Internas (Solo Admins)")}
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                disabled={isDeleted || loading}
                className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm bg-yellow-50"
                placeholder="Notas administrativas privadas..."
                rows={2}
              ></textarea>
            </div>
            {/* Audit info */}
            {user.updated_by && (
              <div className="text-xs text-blueGray-400 bg-blueGray-50 p-2 rounded flex flex-col gap-1">
                <span>Última modif. por: {user.updated_by} el {new Date(user.updated_at!).toLocaleString()}</span>
                {user.status_changed_by && (
                  <span>Estado modif. por: {user.status_changed_by} el {new Date(user.status_changed_at!).toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Status History */}
            {user.status_history && user.status_history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blueGray-200">
                <h4 className="text-sm font-semibold text-blueGray-700 mb-3">Historial de Estados</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                  {[...user.status_history].reverse().map((entry, idx) => (
                    <div key={idx} className="bg-blueGray-50 p-3 rounded border border-blueGray-200 text-xs text-blueGray-600">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{entry.previous_status} ➔ {entry.new_status}</span>
                        <span>{new Date(entry.changed_at).toLocaleString()}</span>
                      </div>
                      <p><strong>Por:</strong> {entry.changed_by}</p>
                      {entry.reason && <p><strong>Motivo:</strong> {entry.reason}</p>}
                      {entry.admin_notes && <p className="text-yellow-700"><strong>Notas (Interno):</strong> {entry.admin_notes}</p>}
                      {entry.expires_at && <p><strong>Expira:</strong> {new Date(entry.expires_at).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isDeleted && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded font-bold border border-red-200">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Este usuario fue eliminado el {new Date(user.deleted_at!).toLocaleString()}.
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-blueGray-200 bg-blueGray-50 flex justify-between items-center gap-3">
          {!isDeleted ? (
            <button 
              onClick={handleSoftDelete}
              disabled={loading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-bold transition-colors"
            >
              <i className="fas fa-trash-alt mr-2"></i>
              {t("admin.actions.delete", "Eliminar")}
            </button>
          ) : <div></div>}

          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-blueGray-600 bg-white border border-blueGray-300 hover:bg-blueGray-100 rounded-md text-sm font-bold shadow-sm"
            >
              {t("admin.actions.cancel", "Cancelar")}
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || isDeleted}
              className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md text-sm font-bold shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                t("admin.actions.save", "Guardar")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
