import React from "react";
import { useTranslation } from "react-i18next";
import default_avatar from "../../assets/img/default_avatar.png";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";


type ProfessionalCardProps = {
    profesional: {
        id: string;
        nombre: string;
        foto?: string;
        categoria: string;
        subcategorias: string[];
        zonas: string[];
        calificacion: number; // entre 0 y 100
        trabajosRealizados: number;
        disponibilidad: string; // ej. "Inmediata", "En 3 días"
    };
    onVerPerfil?: (id: string) => void;
};

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ profesional, onVerPerfil }) => {
    const { t } = useTranslation();

    return (
        <div className="w-full mb-4 px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full shadow-lg rounded-lg p-4">
                <div className="flex items-center mb-4">
                    <img
                        src={profesional.foto || default_avatar}
                        alt={profesional.nombre}
                        className="h-16 w-16 rounded-full border shadow mr-4 object-cover"
                    />
                    <div>
                        <h4 className="text-lg font-bold text-blueGray-700">{profesional.nombre}</h4>
                        <p className="text-sm text-blueGray-500">{profesional.subcategorias.join(", ")}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-yellow-500 text-sm">
                    <span className="text-blueGray-600 mr-2 font-semibold">{t("calificacion")}:</span>
                    {Array.from({ length: 5 }, (_, i) => {
                        const rating = profesional.calificacion || 0;
                        if (rating >= i + 1) return <FaStar key={i} />;
                        if (rating >= i + 0.5) return <FaStarHalfAlt key={i} />;
                        return <FaRegStar key={i} />;
                    })}
                    <span className="text-blueGray-500 ml-2">({profesional.trabajosRealizados || 0})</span>
                </div>

                <p className="text-sm text-blueGray-600">
                    {t("disponibilidad")}: {profesional.disponibilidad}
                </p>

                <div className="text-right mt-4">
                    <button
                        onClick={() => onVerPerfil?.(profesional.id)}
                        className="bg-lightBlue-500 text-white text-xs px-4 py-2 rounded hover:bg-lightBlue-600"
                    >
                        {t("ver_perfil")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalCard;
