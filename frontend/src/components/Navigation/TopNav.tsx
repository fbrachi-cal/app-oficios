import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSearch, FiList, FiUser } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../context/UserContext";
import UserDropdown from "../Dropdowns/UserDropdown";
import LanguageSwitcher from "../LanguageSwitcher";
import logo from "../../assets/img/logo_oficios.png";

/**
 * Primary top navigation bar for the consumer-facing app.
 *
 * Authenticated (desktop):  logo | Buscar · Actividad · Perfil | UserDropdown
 * Authenticated (mobile):   logo only (nav is handled by BottomTabBar)
 * Unauthenticated:          logo | LanguageSwitcher | Login | Register
 */
const TopNav: React.FC = () => {
  const { t } = useTranslation();
  const { usuario, loading } = useAuth();
  const { user } = useUser();

  const isAuthenticated = !loading && !!usuario;

  const desktopTabs = [
    { to: "/buscar", icon: FiSearch, label: t("buscar"), id: "nav-buscar" },
    { to: "/actividad", icon: FiList, label: t("actividad"), id: "nav-actividad" },
  ];

  return (
    <header className="top-0 fixed z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <nav className="px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" id="nav-logo">
            <img
              src={logo}
              alt="Logo Oficios"
              className="h-12 lg:h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop tabs — authenticated only */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1" role="navigation" aria-label={t("navegacion_principal")}>
              {desktopTabs.map(({ to, icon: Icon, label, id }) => (
                <NavLink
                  key={to}
                  to={to}
                  id={id}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <UserDropdown usuario={usuario} />
            ) : (
              <>
                {/* Language switcher only for unauthenticated */}
                <div className="hidden sm:block">
                  <LanguageSwitcher />
                </div>
                <Link to="/login" id="nav-login">
                  <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold uppercase px-5 py-2.5 rounded-lg shadow-sm transition-colors duration-150">
                    {t("ingresar")}
                  </button>
                </Link>
                <Link to="/registro" id="nav-registro">
                  <button className="bg-blue-600 border border-transparent text-white hover:bg-blue-700 text-xs font-bold uppercase px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150">
                    {t("registrarse")}
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default TopNav;
