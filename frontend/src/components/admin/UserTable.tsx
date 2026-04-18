import React from "react";
import { useTranslation } from "react-i18next";
import { AdminUser } from "../../services/adminService";

interface UserTableProps {
  users: AdminUser[];
  onRowClick: (user: AdminUser) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onRowClick }) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-left text-sm text-blueGray-600">
        <thead className="bg-blueGray-50 text-blueGray-500 uppercase font-semibold">
          <tr>
            <th className="px-6 py-4">{t("admin.table.user", "Usuario")}</th>
            <th className="px-6 py-4">{t("admin.table.role", "Rol")}</th>
            <th className="px-6 py-4">{t("admin.table.status", "Estado")}</th>
            <th className="px-6 py-4">{t("admin.table.actions", "Acciones")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blueGray-200">
          {users.map((u) => (
            <tr
              key={u.id}
              className="hover:bg-blueGray-50 transition-colors cursor-pointer"
              onClick={() => onRowClick(u)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blueGray-200 overflow-hidden flex-shrink-0">
                    {u.foto ? (
                      <img src={u.foto} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user text-blueGray-400 m-auto mt-2 text-xl block text-center" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-blueGray-800">{u.nombre || "Sin nombre"}</div>
                    <div className="text-xs text-blueGray-400">{u.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${
                  u.tipo === "admin" ? "bg-purple-100 text-purple-700" :
                  u.tipo === "profesional" ? "bg-lightBlue-100 text-lightBlue-700" :
                  "bg-blueGray-100 text-blueGray-700"
                }`}>
                  {u.tipo || "cliente"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {(() => {
                  const status = u.status || (u.is_active === false ? "SUSPENDED" : "ACTIVE");
                  if (u.deleted_at || status === "DEACTIVATED") {
                    return (
                      <span className="px-2 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full">
                        {t("admin.status.deactivated", "Desactivado")}
                      </span>
                    );
                  }
                  if (status === "EXPELLED") {
                    return (
                      <span className="px-2 py-1 bg-red-600 text-white font-bold text-xs rounded-full">
                        {t("admin.status.expelled", "Expulsado")}
                      </span>
                    );
                  }
                  if (status === "SUSPENDED") {
                    return (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full">
                        {t("admin.status.suspended", "Suspendido")}
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">
                      {t("admin.status.active", "Activo")}
                    </span>
                  );
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button 
                  className="text-lightBlue-600 hover:text-lightBlue-800 font-semibold text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(u);
                  }}
                >
                  <i className="fas fa-edit mr-1"></i>
                  {t("admin.actions.edit", "Editar")}
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-blueGray-400">
                {t("admin.table.no_results", "No se encontraron usuarios")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
