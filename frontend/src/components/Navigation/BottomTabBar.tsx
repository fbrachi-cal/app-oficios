import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSearch, FiList, FiUser } from "react-icons/fi";
import { useUser } from "../../context/UserContext";

/**
 * Mobile-only fixed bottom tab bar for authenticated users.
 * Renders on screens smaller than md (768px).
 * Uses react-router NavLink for active state detection.
 */
const BottomTabBar: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const location = useLocation();

  // Only render for authenticated users
  if (!user) return null;

  const tabs = [
    {
      to: "/buscar",
      icon: FiSearch,
      label: t("buscar"),
      id: "tab-buscar",
    },
    {
      to: "/actividad",
      icon: FiList,
      label: t("actividad"),
      id: "tab-actividad",
    },
    {
      to: "/perfil",
      icon: FiUser,
      label: t("perfil"),
      id: "tab-perfil",
    },
  ];

  return (
    <nav
      id="bottom-tab-bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
      style={{ boxShadow: "0 -1px 0 0 #e2e8f0, 0 -4px 12px 0 rgb(0 0 0 / 0.06)" }}
      aria-label={t("navegacion_principal")}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, icon: Icon, label, id }) => {
          const isActive = location.pathname.startsWith(to) ||
            // Special case: profile tab is active for actualizar-perfil route
            (to === "/perfil" && location.pathname.startsWith("/perfil"));

          return (
            <NavLink
              key={to}
              to={to}
              id={id}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150"
              style={({ isActive: navIsActive }) => ({
                color: navIsActive || isActive ? "#2563EB" : "#94a3b8",
              })}
            >
              {({ isActive: navIsActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={navIsActive || isActive ? 2.5 : 1.8}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
