import { logger } from "../utils/logger";
import React from "react";
import { useUser } from "../context/UserContext";

// Reemplazamos íconos con react-icons
import { FaAward, FaFingerprint, FaCalculator } from "react-icons/fa";

import Navbar from "../components/Navbars/AuthNavbar";
import Footer from "../components/Footers/Footer";

import { useTranslation } from 'react-i18next';
import BuscadorProfesionales from "../components/Home/BuscadorProfesionales";
import PanelSolicitudes from "../components/Home/PanelSolicitudes";
import { useNavigate } from "react-router-dom";


const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser(); // 👈
  const navigate = useNavigate();
  logger.info("USER TIPO", { tipo: user?.tipo });
  return (
    <>
      <main>
        <Navbar transparent />
        <main>
          <div className="relative pt-32 pb-48 sm:pt-16 sm:pb-32 flex content-center items-center justify-center min-h-[85vh] sm:min-h-screen-75">
            <div
              className="absolute top-0 w-full h-full bg-center bg-cover"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1267&q=80')",
              }}
            >
              <span
                id="blackOverlay"
                className="w-full h-full absolute opacity-75 bg-black"
              ></span>
            </div>
            <div className="container relative mx-auto z-10 pt-16 sm:pt-0">
              <div className="items-center flex flex-wrap">
                <div className="w-full lg:w-6/12 px-4 ml-auto mr-auto text-center">
                  <div className="pr-0 sm:pr-12">
                    <h1 className="text-white font-semibold text-4xl sm:text-5xl leading-tight">
                      {t('landing_hero_title')}
                    </h1>
                    <p className="mt-4 text-lg text-blueGray-200">
                      {t('landing_hero_subtitle')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-70-px"
              style={{ transform: "translateZ(0)" }}
            >
              <svg
                className="absolute bottom-0 overflow-hidden"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                version="1.1"
                viewBox="0 0 2560 100"
                x="0"
                y="0"
              >
                <polygon
                  className="text-blueGray-200 fill-current"
                  points="2560 0 2560 100 0 100"
                ></polygon>
              </svg>
            </div>
          </div>

          <section className="pb-20 bg-blueGray-200 -mt-24 relative z-20">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap">                  
                {user?.tipo === "cliente" ? (
                  <BuscadorProfesionales />
                ): (
                  
                  <div className="w-full md:w-4/12 px-4 text-center">
                  <div 
                    className={`relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg ${!user ? "cursor-pointer hover:shadow-xl transition-all duration-300" : ""}`}
                    onClick={() => {
                        if (!user) {
                            navigate('/auth/registro');
                        }
                    }}
                  >
                    <div className="px-4 py-5 flex-auto">
                    <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-lightBlue-400">
                        <FaCalculator className="text-white" />
                      </div>
                      <h6 className="text-xl font-semibold">{t('landing_pro_headline')}</h6>
                      <p className="mt-2 mb-4 text-blueGray-500 font-bold">
                        {t('landing_pro_subtitle')}
                      </p>
                    </div>
                  </div>
                </div>
                )}
                <PanelSolicitudes />

                <div className="pt-6 w-full md:w-4/12 px-4 text-center">
                  <div 
                    className={`relative flex flex-col min-w-0 break-words bg-white w-full mb-8 shadow-lg rounded-lg ${!user ? "cursor-pointer hover:shadow-xl transition-all duration-300" : ""}`}
                    onClick={() => {
                        if (!user) {
                            navigate('/auth/registro');
                        }
                    }}
                  >
                    <div className="px-4 py-5 flex-auto">
                      <div className="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-emerald-400">
                        <FaFingerprint className="text-white" />
                      </div>
                      <h6 className="text-xl font-semibold">{t('landing_pro_benefits_title')}</h6>
                      <p className="mt-2 mb-4 text-blueGray-500">
                        {t('landing_pro_benefits_desc_1')}
                      </p>
                      <ul className="text-left text-blueGray-500 space-y-1 mb-4 text-sm font-semibold">
                        <li><i className="fas fa-check text-emerald-500 mr-2"></i>{t('landing_pro_benefits_li_1')}</li>
                        <li><i className="fas fa-check text-emerald-500 mr-2"></i>{t('landing_pro_benefits_li_2')}</li>
                        <li><i className="fas fa-check text-emerald-500 mr-2"></i>{t('landing_pro_benefits_li_3')}</li>
                        <li><i className="fas fa-check text-emerald-500 mr-2"></i>{t('landing_pro_benefits_li_4')}</li>
                      </ul>
                      <p className="font-bold text-blueGray-700 text-left">
                        {t('landing_pro_benefits_price')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </main>
    </>
  );
};

export default Landing;
