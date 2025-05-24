import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserDropdown from "../Dropdowns/UserDropdown";
import logo from "../../assets/img/logo_oficios.png";
import { useAuth } from "../../context/AuthContext";
import { ChatIcon } from "../Chat/ChatIcon";
import { ChatDrawer } from "../Chat/ChatDrawer";

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
      <div className="container px-4 mx-auto flex items-center justify-between">
          {/* Logo + hamburguesa */}
          <div className="w-full relative flex justify-between lg:w-auto lg:static lg:block lg:justify-start">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Logo" className="h-20 w-auto mr-4" />
            </Link>
            <button
              className="cursor-pointer text-xl leading-none px-3 py-1 border border-transparent rounded bg-transparent block  outline-none"
              type="button"
              onClick={() => setNavbarOpen(!navbarOpen)}
            >
              <i className="text-black fas fa-bars"></i> 
            </button>
          </div>

          {/* Menú desplegable */}
          
          <div className="w-full flex items-center transition-all duration-200 ease-in-out">

            <ul className="flex flex-row list-none ml-auto items-center space-x-4">              

              {usuario ? (
                <li className="flex items-center">
                  <ChatIcon onClick={() => setChatOpen(true)} />
                </li>
              ):(<li></li>)}

              {usuario ? (
                <li className="flex flex-col items-center">                  
                  <UserDropdown usuario={usuario} />
                </li>
              ) : (
                <>
                  <li className="flex flex-col items-center my-2 lg:my-0">
                    <Link to="/auth/login">
                      <button className="bg-green-600 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md w-full lg:w-auto">
                        {t("ingresar")}
                      </button>
                    </Link>
                  </li>
                  <li className="flex items-center my-2 lg:my-0">
                    <Link to="/auth/registro">
                      <button className="bg-white text-blueGray-700 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md w-full lg:w-auto">
                        {t("registrarse")}
                      </button>
                    </Link>
                  </li>
                </>
              )}

            </ul>
          </div>
        </div>
      </nav>

      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default Navbar;
