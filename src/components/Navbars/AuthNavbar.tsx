import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserDropdown from "../Dropdowns/UserDropdown";
import logo from "../../assets/img/logo_oficios.png";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../LanguageSwitcher";

type NavbarProps = {
  transparent?: boolean;
};

const Navbar: React.FC<NavbarProps> = ({}) => {
  const { t } = useTranslation();
  const { usuario } = useAuth();
  
  return (
    <>
      <nav className="top-0 absolute z-40 w-full flex flex-wrap items-center justify-between px-2 py-3">
      <div className="container px-4 mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="w-auto flex justify-start">
            <Link to="/" className="flex items-center shrink-0">
              <img src={logo} alt="Logo" className="h-12 sm:h-16 lg:h-20 w-auto object-contain shrink-0" />
            </Link>
          </div>

          {/* Action Items */}
          <div className="flex flex-row items-center justify-end space-x-3 sm:space-x-4 ml-auto">
            
            <LanguageSwitcher />

            {usuario ? (
              <UserDropdown usuario={usuario} />
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link to="/auth/login">
                  <button className="bg-green-600 text-white text-[10px] sm:text-xs font-bold uppercase px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow hover:shadow-md transition-colors">
                    {t("ingresar")}
                  </button>
                </Link>
                <Link to="/auth/registro">
                  <button className="bg-transparent border border-blueGray-400 text-white hover:border-white hover:bg-blueGray-800 text-[10px] sm:text-xs font-bold uppercase px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow hover:shadow-md transition-colors">
                    {t("registrarse")}
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
