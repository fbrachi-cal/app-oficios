import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import UserDropdown from "../Dropdowns/UserDropdown";
import logo from "../../assets/img/logo_oficios.png"; 


type NavbarProps = {
  transparent?: boolean;
};

const Navbar: React.FC<NavbarProps> = ({ transparent }) => {
  const [usuario, setUsuario] = useState<any>(null);
  const { t } = useTranslation();
  const [navbarOpen, setNavbarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="top-0 absolute z-50 w-full flex flex-wrap items-center justify-between px-2 py-3 navbar-expand-lg">
      <div className="container px-4 mx-auto flex flex-wrap items-center justify-between">
        {/* Logo + idiomas */}
        <div className="w-full relative flex justify-between lg:w-auto lg:static lg:block lg:justify-start">
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-20 w-auto mr-4"
            />
          </Link>          
          <button
            className="cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none"
            type="button"
            onClick={() => setNavbarOpen(!navbarOpen)}
          >
            <i className="text-white fas fa-bars"></i>
          </button>
        </div>

        {/* Menú */}
        <div
          className={
            "lg:flex flex-grow items-center bg-white lg:bg-opacity-0 lg:shadow-none" +
            (navbarOpen ? " block rounded shadow-lg" : " hidden")
          }
          id="example-navbar-warning"
        >
          <ul className="flex flex-col lg:flex-row list-none mr-auto">
            {/* Podés poner navegación acá si querés */}
          </ul>

          <ul className="flex flex-col lg:flex-row list-none lg:ml-auto">
            <li className="flex items-center">
              <a
                className="lg:text-white lg:hover:text-blueGray-200 text-blueGray-700 px-3 py-4 lg:py-2 flex items-center text-xs uppercase font-bold"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-github text-lg leading-lg" />
                <span className="lg:hidden inline-block ml-2">GitHub</span>
              </a>
            </li>

            {usuario ? (
              <li className="flex items-center">
                <UserDropdown usuario={usuario} />
              </li>
            ) : (
              <li className="flex items-center">
                <Link to="/auth/login">
                  <button className="bg-green-600 text-white text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md">
                    {t("ingresar")}
                  </button>
                </Link>
                <Link to="/auth/registro">
                  <button className="bg-white text-blueGray-700 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-md ml-3">
                    {t("registrarse")}
                  </button>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
