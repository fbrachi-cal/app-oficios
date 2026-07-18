import { useTranslation } from "react-i18next";
import { useLoading } from "../../context/LoadingContext";

const LoadingScreen = () => {
  const { t } = useTranslation();
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4 mx-auto"></div>
        <p className="text-lg font-semibold text-white">{t("cargando")}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
