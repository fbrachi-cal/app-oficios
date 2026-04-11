import React from "react";
import { useTranslation } from "react-i18next";

interface Profesional {
  id: string;
  nombre: string;
  oficios: string[];
  zonas: string[];
  tipo: string;
}

type CardTableProps = {
  profesionales?: Profesional[];
  color?: "light" | "dark";
};

const CardTable: React.FC<CardTableProps> = ({ profesionales = [], color = "light" }) => {
  const { t } = useTranslation();
  return (
    <div
      className={
        "relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " +
        (color === "light" ? "bg-white" : "bg-lightBlue-900 text-white")
      }
    >
      <div className="rounded-t mb-0 px-4 py-3 border-0">
        <div className="flex flex-wrap items-center">
          <div className="relative w-full px-4 max-w-full flex-grow flex-1">
            <h3
              className={
                "font-semibold text-lg " +
                (color === "light" ? "text-blueGray-700" : "text-white")
              }
            >
              {t("profesionales_encontrados")}
            </h3>
          </div>
        </div>
      </div>
      <div className="block w-full overflow-x-auto">
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3 text-xs uppercase font-semibold text-left border-b">{t("nombre")}</th>
              <th className="px-6 py-3 text-xs uppercase font-semibold text-left border-b">{t("oficios")}</th>
              <th className="px-6 py-3 text-xs uppercase font-semibold text-left border-b">{t("zonas")}</th>
              <th className="px-6 py-3 text-xs uppercase font-semibold text-left border-b">{t("tipo")}</th>
            </tr>
          </thead>
          <tbody>
            {profesionales.map((prof) => (
              <tr key={prof.id}>
                <td className="px-6 py-4 border-b text-sm">{prof.nombre}</td>
                <td className="px-6 py-4 border-b text-sm">{prof.oficios.join(", ")}</td>
                <td className="px-6 py-4 border-b text-sm">{prof.zonas.join(", ")}</td>
                <td className="px-6 py-4 border-b text-sm">{prof.tipo}</td>
              </tr>
            ))}
            {profesionales.length === 0 && (
              <tr>
                <td className="px-6 py-4 border-b text-sm text-center" colSpan={4}>
                  {t("sin_resultados_mostrar")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CardTable;