import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import config from "../../config";
import { useUser } from "../../context/UserContext";

const TermsAndConditionsPage = () => {
  const [terms, setTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const navigate = useNavigate();
  const { user, refrescarUsuario } = useUser();

  useEffect(() => {
    // If user doesn't require acceptance anymore, redirect to home
    if (user && user.requires_tyc_acceptance === false) {
      navigate("/home", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/tyc/current`);
        if (res.ok) {
          const data = await res.json();
          setTerms(data);
        }
      } catch (err) {
        console.error("Error fetching T&C", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${config.apiBaseUrl}/usuarios/me/tyc/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        await refrescarUsuario();
        navigate("/home", { replace: true });
      } else {
        console.error("Error al aceptar términos");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando términos...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Términos y Condiciones
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Por favor, lee y acepta los términos para continuar.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6 h-64 overflow-y-auto p-4 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
            {terms?.text || "No se pudieron cargar los términos."}
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleAccept}
              disabled={accepting || !terms}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (accepting || !terms) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {accepting ? "Aceptando..." : "Aceptar Términos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
