import { logger } from "../utils/logger";
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth } from '../firebase';
import config from '../config';

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setUsuario(user);

      if (user) {
        try {
          const token = await getIdToken(user);
          const res = await fetch(`${config.apiBaseUrl}/usuarios/me/tipo`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setTipo(data.tipo);
          }
        } catch (err) {
          logger.error("Error al obtener tipo de usuario", err);
        }
      } else {
        setTipo(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, tipo, loading, setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);