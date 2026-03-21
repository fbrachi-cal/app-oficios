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

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, isOpen, onClose, onUserChange }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // Local form state
  const [role, setRole] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      setRole(user.tipo || "cliente");
      setIsActive(user.is_active !== false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isDeleted = !!user.deleted_at;

  const handleSave = async () => {
    setLoading(true);
    try {
      const patch: AdminUserPatch = {};
      if (role !== user.tipo) patch.tipo = role;
      if (isActive !== (user.is_active !== false)) patch.is_active = isActive;

      if (Object.keys(patch).length > 0) {
        const updated = await adminService.patchUser(user.id, patch);
        onUserChange(updated);
        alert(t("admin.messages.user_updated", "Usuario actualizado correctamente"));
      }
      onClose();
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
                value={role} 
                onChange={e => setRole(e.target.value)}
                disabled={isDeleted || loading}
                className="w-full border-blueGray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Activo / Inactivo */}
            <div className="flex items-center justify-between bg-blueGray-50 p-3 rounded-md">
              <div>
                <span className="block text-sm font-semibold text-blueGray-700 border-none">
                  {t("admin.modal.active_account", "Cuenta Activa")}
                </span>
                <span className="text-xs text-blueGray-500">
                  {t("admin.modal.disable_warn", "Deshabilitar impide el inicio de sesión")}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isDeleted || loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            
            {/* Audit info */}
            {user.updated_by && (
              <div className="text-xs text-blueGray-400 bg-blueGray-50 p-2 rounded">
                Última modif. por: {user.updated_by} el {new Date(user.updated_at!).toLocaleString()}
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
