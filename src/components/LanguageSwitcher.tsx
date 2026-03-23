import React from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const LanguageSwitcher: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center space-x-2 px-3 py-2">
            <button
                onClick={() => {
                    i18n.changeLanguage("es");
                    localStorage.setItem("idioma", "es");
                }}
                className={`focus:outline-none transition-opacity duration-150 ${i18n.language === "es" ? "opacity-100 grayscale-0" : "opacity-50 grayscale"
                    }`}
                title={t("espanol", "Español")}
            >
                <img src="https://flagcdn.com/ar.svg" alt="Argentina" className="w-6 h-4 object-cover shadow-sm rounded-sm" />
            </button>
            <span className="text-blueGray-300">/</span>
            <button
                onClick={() => {
                    i18n.changeLanguage("en");
                    localStorage.setItem("idioma", "en");
                }}
                className={`focus:outline-none transition-opacity duration-150 ${i18n.language === "en" ? "opacity-100 grayscale-0" : "opacity-50 grayscale"
                    }`}
                title={t("ingles", "Inglés")}
            >
                <img src="https://flagcdn.com/us.svg" alt="English" className="w-6 h-4 object-cover shadow-sm rounded-sm" />
            </button>
        </div>
    );
};

export default LanguageSwitcher;
