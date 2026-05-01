import React, { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../firebase";
import config from "../config";

type UserData = {
    id: string;
    nombre: string;
    tipo: string;
    zonas?: string[];
    oficios?: string[];
    foto?: string;
    descripcion: string;
    disponibilidad: string;    
    requires_tyc_acceptance?: boolean;
};

const UserContext = createContext<{
    user: UserData | null;
    setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
    refrescarUsuario: () => Promise<void>;
}>({
    user: null,
    setUser: () => { },
    refrescarUsuario: async () => { },
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);

    const refrescarUsuario = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                await refrescarUsuario();
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, refrescarUsuario }}>
            {children}
        </UserContext.Provider>
    );
};

