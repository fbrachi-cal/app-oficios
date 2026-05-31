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

export type ProfileStatus = "loading" | "ready" | "missing" | "error";

const UserContext = createContext<{
    user: UserData | null;
    setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
    profileStatus: ProfileStatus;
    profileLoading: boolean;
    refrescarUsuario: () => Promise<void>;
}>({
    user: null,
    setUser: () => { },
    profileStatus: "loading",
    profileLoading: true,
    refrescarUsuario: async () => { },
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");

    const refrescarUsuario = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            setProfileStatus("loading");
            try {
                const token = await firebaseUser.getIdToken();
                const res = await fetch(`${config.apiBaseUrl}/usuarios/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 200) {
                    const data = await res.json();
                    setUser(data);
                    setProfileStatus("ready");
                } else if (res.status === 404) {
                    setUser(null);
                    setProfileStatus("missing");
                } else {
                    setUser(null);
                    setProfileStatus("error");
                }
            } catch (err) {
                console.error("Error al refrescar usuario:", err);
                setUser(null);
                setProfileStatus("error");
            }
        } else {
            setUser(null);
            setProfileStatus("missing");
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                await refrescarUsuario();
            } else {
                setUser(null);
                setProfileStatus("missing");
            }
        });

        return () => unsubscribe();
    }, []);

    const profileLoading = profileStatus === "loading";

    return (
        <UserContext.Provider value={{ user, setUser, profileStatus, profileLoading, refrescarUsuario }}>
            {children}
        </UserContext.Provider>
    );
};

