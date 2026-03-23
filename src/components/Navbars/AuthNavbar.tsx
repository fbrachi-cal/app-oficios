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
      <nav className="top-0 absolute z-40 w-full px-2 py-4">
        <div className="container px-4 mx-auto flex flex-col sm:flex-row items-center justify-between gap-y-4 sm:gap-y-0">
          
          {/* Logo Row */}
          <div className="w-full sm:w-auto flex justify-center sm:justify-start">
            <Link to="/" className="flex items-center shrink-0">
              <img src={logo} alt="Logo" className="h-16 lg:h-20 w-auto object-contain shrink-0" />
            </Link>
          </div>

          {/* Action Items Row */}
          <div className="w-full sm:w-auto flex flex-row items-center justify-center sm:justify-end space-x-4 sm:space-x-6">
            
            {!usuario && <LanguageSwitcher />}

            {usuario ? (
              <UserDropdown usuario={usuario} />
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth/login">
                  <button className="bg-green-600 border border-transparent text-white text-[11px] sm:text-xs font-bold uppercase px-5 py-2.5 rounded shadow hover:bg-green-700 hover:shadow-md transition-all duration-200 ease-in-out">
                    {t("ingresar")}
                  </button>
                </Link>
                <Link to="/auth/registro">
                  <button className="bg-transparent border border-blueGray-500 text-blueGray-200 hover:text-white hover:border-blueGray-300 hover:bg-blueGray-800 text-[11px] sm:text-xs font-bold uppercase px-5 py-2.5 rounded shadow hover:shadow-md transition-all duration-200 ease-in-out">
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
