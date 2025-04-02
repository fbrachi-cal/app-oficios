import React from "react";
import { Outlet } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";

// components
import Navbar from "../components/Navbars/AuthNavbar";
import FooterSmall from "../components/Footers/Footer";

// views
import Login from "../views/auth/Login";
import Register from "../views/auth/Register";

import backgroundImage from "../assets/img/register_bg_2.png";


const Auth = (): JSX.Element => {
  return (
    <>
      <Navbar transparent />
      <main>
        <section className="relative w-full h-full py-40 min-h-screen">
          <div
            className="absolute top-0 w-full h-full bg-blueGray-800 bg-no-repeat bg-full"
            style={{
              backgroundImage: `url(${backgroundImage})`,
            }}
          ></div>
          <Outlet />
          
          <FooterSmall absolute />
        </section>
      </main>
    </>
  );
};

export default Auth;
