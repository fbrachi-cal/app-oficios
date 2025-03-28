import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const Navbar = () => {
  const navigate = useNavigate();
  const { usuario, rol } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const cambiarIdioma = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <Link to="/" className="text-lg font-bold">
        {t('titulo')}
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button onClick={() => cambiarIdioma('es')} className="text-sm">ES</button>
          <button onClick={() => cambiarIdioma('en')} className="text-sm">EN</button>
        </div>

        {usuario && rol ? (
          <>
            {rol === 'cliente' && <Link to="/buscar" className="hover:underline">{t('buscar')}</Link>}
            {rol === 'profesional' && <Link to="/solicitudes" className="hover:underline">{t('solicitudes')}</Link>}
            {rol === 'admin' && <Link to="/admin" className="hover:underline">Admin</Link>}
            <span className="text-sm hidden sm:inline">{usuario.email}</span>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded text-sm">
              {t('salir')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline text-sm">{t('ingresar')}</Link>
            <Link to="/registro" className="hover:underline text-sm">{t('registrarse')}</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;