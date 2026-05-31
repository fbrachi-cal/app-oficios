import { logger } from "../utils/logger";
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth } from '../firebase';
import config from '../config';
import { useUser } from './UserContext';

interface AuthContextType {
  usuario: any;
  tipo: string | null;
  loading: boolean;
  setUsuario: (usuario: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  tipo: null,
  loading: true,
  setUsuario: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [usuario, setUsuario] = useState<any>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { profileStatus } = useUser();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUsuario(user);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchTipo = async () => {
      // Gate role/type loading behind profileStatus === "ready"
      if (usuario && profileStatus === "ready") {
        try {
          const token = await getIdToken(usuario);
          const res = await fetch(`${config.apiBaseUrl}/usuarios/me/tipo`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setTipo(data.tipo);
          } else {
            // Expected 404s/non-ok status during onboarding or other flows logged at info
            logger.info("usuarios/me/tipo responded with non-ok status", { status: res.status });
            setTipo(null);
          }
        } catch (err) {
          logger.error("Error al obtener tipo de usuario", err);
        }
      } else {
        setTipo(null);
      }
    };

    fetchTipo();
  }, [usuario, profileStatus]);

  return (
    <AuthContext.Provider value={{ usuario, tipo, loading, setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);