import React from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import arFlag from "../assets/img/ar.svg";
import usFlag from "../assets/img/us.svg";

const LanguageSwitcher: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center space-x-3 px-2 py-1">
            <button
                onClick={() => {
                    i18n.changeLanguage("es");
                    localStorage.setItem("idioma", "es");
                }}
                className={`focus:outline-none transition-opacity duration-150 ${i18n.language === "es" ? "opacity-100 grayscale-0" : "opacity-50 grayscale"
                    }`}
                title={t("espanol", "Español")}
            >
                <img src={arFlag} alt="Argentina" className="w-7 h-5 object-cover shadow-sm rounded-sm" />
            </button>
            <span className="text-blueGray-500 font-bold mx-1">/</span>
            <button
                onClick={() => {
                    i18n.changeLanguage("en");
                    localStorage.setItem("idioma", "en");
                }}
                className={`focus:outline-none transition-opacity duration-150 ${i18n.language === "en" ? "opacity-100 grayscale-0" : "opacity-50 grayscale"
                    }`}
                title={t("ingles", "Inglés")}
            >
                <img src={usFlag} alt="English" className="w-7 h-5 object-cover shadow-sm rounded-sm" />
            </button>
        </div>
    );
};

export default LanguageSwitcher;
