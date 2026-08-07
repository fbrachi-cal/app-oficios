import React, { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../firebase";
import config from "../config";
import { fetchConToken } from "../utils/fetchConToken";

type UserData = {
    id: string;
    nombre: string;
    tipo: string;
    zonas?: string[];
    oficios?: string[];
    subcategorias?: string[];
    foto?: string;
    descripcion: string;
    disponibilidad: string;    
    requires_tyc_acceptance?: boolean;
    telefono?: string;
};

export type ProfileStatus = "loading" | "ready" | "missing" | "error";

const UserContext = createContext<{
    user: UserData | null;
    setUser: React.Dispatch<React.SetStateAction<UserData | null>>;
    profileStatus: ProfileStatus;
    profileLoading: boolean;
    refrescarUsuario: (fUser?: any) => Promise<ProfileStatus>;
}>({
    user: null,
    setUser: () => { },
    profileStatus: "loading",
    profileLoading: true,
    refrescarUsuario: async (fUser?: any) => "loading" as ProfileStatus,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");
    const [loadedUid, setLoadedUid] = useState<string>("");

    const refrescarUsuario = async (fUser?: any): Promise<ProfileStatus> => {
        const firebaseUser = fUser || auth.currentUser;
        if (firebaseUser) {
            setProfileStatus("loading");
            try {
                const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/me`);
                if (res.status === 200) {
                    const data = await res.json();
                    setUser(data);
                    setProfileStatus("ready");
                    return "ready";
                } else if (res.status === 404) {
                    setUser(null);
                    setProfileStatus("missing");
                    return "missing";
                } else if (res.status === 403) {
                    setUser(null);
                    setProfileStatus("error");
                    try {
                        const errorData = await res.json();
                        const searchParams = new URLSearchParams();
                        if (errorData.detail?.status) searchParams.set("status", errorData.detail.status);
                        if (errorData.detail?.reason) searchParams.set("reason", errorData.detail.reason);
                        if (errorData.detail?.expires_at) searchParams.set("expires_at", errorData.detail.expires_at);
                        window.location.href = `/bloqueado?${searchParams.toString()}`;
                    } catch (e) {
                        window.location.href = "/bloqueado";
                    }
                    return "error";
                } else {
                    setUser(null);
                    setProfileStatus("error");
                    return "error";
                }
            } catch (err) {
                console.error("Error al refrescar usuario:", err);
                setUser(null);
                setProfileStatus("error");
                return "error";
            } finally {
                setLoadedUid(firebaseUser.uid);
            }
        } else {
            setUser(null);
            setProfileStatus("missing");
            setLoadedUid("");
            return "missing";
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                await refrescarUsuario(firebaseUser);
            } else {
                setUser(null);
                setProfileStatus("missing");
                setLoadedUid("");
            }
        });

        return () => unsubscribe();
    }, []);

    const profileLoading = profileStatus === "loading" || (!!auth.currentUser && loadedUid !== auth.currentUser.uid);

    return (
        <UserContext.Provider value={{ user, setUser, profileStatus, profileLoading, refrescarUsuario }}>
            {children}
        </UserContext.Provider>
    );
};

