/**
 * AdminSidebar – left-column navigation for the admin panel.
 * Uses NavLink for active-state highlighting.
 * Designed to sit inside the 3-column layout shell.
 */
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

type NavItem = {
  label: string;
  to: string;
  icon: string; // Font Awesome class
};

const NAV_ITEMS: NavItem[] = [
  { label: "admin.nav.users", to: "/admin/usuarios", icon: "fas fa-users" },
  { label: "admin.nav.chats", to: "/admin/chats", icon: "fas fa-comments" },
  { label: "admin.nav.reports", to: "/admin/reportes", icon: "fas fa-flag" },
];

const AdminSidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="w-64 min-h-screen bg-blueGray-800 text-white flex flex-col py-6 shadow-xl">
      {/* Header */}
      <div className="px-6 mb-8">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blueGray-400">
          <i className="fas fa-shield-alt" />
          {t("admin.panel_label", "Panel Admin")}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-green-600 text-white shadow-md"
                  : "text-blueGray-300 hover:bg-blueGray-700 hover:text-white",
              ].join(" ")
            }
          >
            <i className={`${item.icon} w-4 text-center`} />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 pt-6 border-t border-blueGray-700">
        <NavLink
          to="/home"
          className="flex items-center gap-2 text-xs text-blueGray-400 hover:text-white transition-colors duration-150"
        >
          <i className="fas fa-arrow-left" />
          {t("admin.nav.back_to_app", "Volver a la app")}
        </NavLink>
      </div>
    </aside>
  );
};

export default AdminSidebar;
