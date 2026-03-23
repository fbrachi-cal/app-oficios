import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserDropdown from "../Dropdowns/UserDropdown";
import logo from "../../assets/img/logo_oficios.png";
import { useAuth } from "../../context/AuthContext";
import { ChatIcon } from "../Chat/ChatIcon";
import { ChatDrawer } from "../Chat/ChatDrawer";
import LanguageSwitcher from "../LanguageSwitcher";

type NavbarProps = {
  transparent?: boolean;
};

const Navbar: React.FC<NavbarProps> = ({}) => {
  const { t } = useTranslation();
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { usuario } = useAuth();
  return (
    <>
      <nav className="top-0 absolute z-40 w-full flex flex-wrap items-center justify-between px-2 py-3">
      <div className="container px-4 mx-auto flex flex-wrap items-center justify-between">
          {/* Logo + hamburguesa */}
          <div className="w-full relative flex justify-between lg:w-auto lg:static lg:block lg:justify-start">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Logo" className="h-14 sm:h-16 lg:h-20 w-auto mr-4 shrink-0 object-contain" />
            </Link>
            <button
              className="cursor-pointer text-xl leading-none px-3 py-1 border border-transparent rounded bg-transparent block lg:hidden outline-none"
              type="button"
              onClick={() => setNavbarOpen(!navbarOpen)}
            >
              <i className="text-black fas fa-bars"></i> 
            </button>
          </div>

          {/* Menú desplegable */}
          <div 
             className={
               "lg:flex flex-grow items-center transition-all duration-200 ease-in-out lg:w-auto lg:bg-transparent lg:shadow-none lg:p-0 lg:mt-0 " + 
               (navbarOpen ? "w-full flex flex-col bg-white shadow-lg p-4 mt-2 rounded-lg" : "hidden")
             }
          >
            <ul className="flex flex-col lg:flex-row list-none lg:ml-auto items-center space-y-4 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">              

              {usuario ? (
                <li className="flex items-center w-full lg:w-auto justify-center">
                  <ChatIcon onClick={() => setChatOpen(true)} />
                </li>
              ):(<li className="hidden"></li>)}

              {usuario ? (
                <li className="flex flex-col items-center w-full lg:w-auto justify-center">                  
                  <UserDropdown usuario={usuario} />
                </li>
              ) : (
                <>
                  <li className="flex flex-col items-center my-2 lg:my-0 w-full lg:w-auto">
                    <Link to="/auth/login" className="w-full">
                      <button className="bg-green-600 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md w-full lg:w-auto transition-colors">
                        {t("ingresar")}
                      </button>
                    </Link>
                  </li>
                  <li className="flex items-center my-2 lg:my-0 w-full lg:w-auto">
                    <Link to="/auth/registro" className="w-full">
                      <button className="bg-white text-blueGray-700 text-xs font-bold border border-blueGray-200 uppercase px-4 py-2 rounded shadow hover:shadow-md w-full lg:w-auto transition-colors">
                        {t("registrarse")}
                      </button>
                    </Link>
                  </li>
                </>
              )}

              {/* Language Switcher unconditionally rendered */}
              <li className="flex items-center justify-center my-2 lg:my-0 w-full lg:w-auto border-t lg:border-t-0 border-blueGray-100 pt-4 lg:pt-0">
                <LanguageSwitcher />
              </li>

            </ul>
          </div>
        </div>
      </nav>

      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default Navbar;
