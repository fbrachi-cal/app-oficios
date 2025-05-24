import { useLoading } from "../../context/LoadingContext";

const LoadingScreen = () => {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.7)] bg-opacity-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-lightBlue-500 mb-4"></div>
        <p className="text-lg font-semibold text-blueGray-700">Cargando...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
