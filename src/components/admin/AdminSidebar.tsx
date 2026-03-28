/**
 * AdminSidebar – left-column navigation for the admin panel.
 * Uses NavLink for active-state highlighting.
 */
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconType } from "react-icons";
import { FiUsers, FiMessageSquare, FiFlag, FiStar, FiShield, FiArrowLeft } from "react-icons/fi";

type NavItem = {
  label: string;
  to: string;
  Icon: IconType;
};

const NAV_ITEMS: NavItem[] = [
  { label: "admin.nav.users",   to: "/admin/usuarios",      Icon: FiUsers },
  { label: "admin.nav.chats",   to: "/admin/chats",         Icon: FiMessageSquare },
  { label: "admin.nav.reports", to: "/admin/reportes",      Icon: FiFlag },
  { label: "admin.nav.ratings", to: "/admin/calificaciones", Icon: FiStar },
];

const AdminSidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="w-64 min-h-screen bg-blueGray-800 text-white flex flex-col py-6 shadow-xl">
      {/* Header */}
      <div className="px-6 mb-8">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blueGray-400">
          <FiShield size={14} />
          {t("admin.panel_label", "Panel Admin")}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-green-600 text-white shadow-md"
                  : "text-blueGray-300 hover:bg-blueGray-700 hover:text-white",
              ].join(" ")
            }
          >
            <Icon size={16} />
            {t(label)}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 pt-6 border-t border-blueGray-700">
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

export default AdminSidebar;
