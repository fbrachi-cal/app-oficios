/**
 * RecruiterSidebar – left-column navigation for the CV module.
 */
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiFileText, FiShield, FiArrowLeft, FiUsers } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const RecruiterSidebar = () => {
  const { t } = useTranslation();
  const { tipo } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-blueGray-800 text-white flex flex-col py-6 shadow-xl">
      {/* Header */}
      <div className="px-6 mb-8">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blueGray-400">
          <FiShield size={14} />
          {t("recruiter.panel_label", "Recruiter Panel")}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        <NavLink
          to="/recruiter/cvs"
          className={({ isActive }) =>
            [
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-indigo-600 text-white shadow-md"
                : "text-blueGray-300 hover:bg-blueGray-700 hover:text-white",
            ].join(" ")
          }
        >
          <FiFileText size={16} />
          {t("recruiter.nav.cvs", "Gestión de CVs")}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-6 pt-6 border-t border-blueGray-700 flex flex-col gap-4">
        {tipo === "admin" && (
          <NavLink
            to="/admin/usuarios"
            className="flex items-center gap-2 text-xs text-blueGray-400 hover:text-white transition-colors duration-150"
          >
            <FiUsers size={14} />
            {t("admin.nav.back_to_user_management", "Volver a gestión de usuarios")}
          </NavLink>
        )}
        <NavLink
          to="/home"
          className="flex items-center gap-2 text-xs text-blueGray-400 hover:text-white transition-colors duration-150"
        >
          <FiArrowLeft size={14} />
          {t("admin.nav.back_to_app", "Volver a la app")}
        </NavLink>
      </div>
    </aside>
  );
};

export default RecruiterSidebar;
