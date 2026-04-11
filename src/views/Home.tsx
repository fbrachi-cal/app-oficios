import { logger } from "../utils/logger";
import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  const [usuario, setUsuario] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    logger.info("URL del backend:", { url: config.apiBaseUrl });
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setUsuario(user);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe(); // cleanup
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-4">{t('bienvenido')}</h1>

      {usuario && (
        <div className="mb-4">
          <p className="text-lg">{t('email')}: <strong>{usuario.email}</strong></p>
          <p className="text-sm text-gray-600">UID: {usuario.uid}</p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        {t('cerrar_sesion')}
      </button>
    </div>
  );
};

export default Home;
