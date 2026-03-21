import React, { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useTranslation } from "react-i18next";
import { createPopper } from "@popperjs/core";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import default_avatar from "../../assets/img/default_avatar.png";

interface UserDropdownProps {
    usuario: any; // Reemplazá `any` por un tipo más específico si lo tenés
}

const UserDropdown: React.FC<UserDropdownProps> = ({usuario}) => {    
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const btnDropdownRef = useRef<HTMLAnchorElement>(null);
    const popoverDropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();
    const cerrarSesion = async () => {
        await signOut(auth);
    };

    const irAlPerfil = () => {
        setOpen(false);
        navigate("/auth/actualizar-perfil");
    };

    const openDropdown = () => {
        if (btnDropdownRef.current && popoverDropdownRef.current) {
            createPopper(btnDropdownRef.current, popoverDropdownRef.current, {
                placement: "bottom-start",
            });
        }
        setOpen(true);
    };

    const closeDropdown = () => setOpen(false);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        open ? closeDropdown() : openDropdown();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverDropdownRef.current &&
                !popoverDropdownRef.current.contains(event.target as Node) &&
                btnDropdownRef.current &&
                !btnDropdownRef.current.contains(event.target as Node)
            ) {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <>
            <a
                href="#"
                className="text-blueGray-500 block"
                ref={btnDropdownRef}
                onClick={toggleMenu}
            >
                <div className="items-center flex">
                    <span className="w-12 h-12 text-sm text-white bg-blueGray-200 inline-flex items-center justify-center rounded-full">
                        <img
                            alt="Avatar"
                            className="w-full rounded-full align-middle border-none shadow-lg"
                            src={user.foto || default_avatar}
                        />
                    </span>
                </div>
            </a>
            <div
                ref={popoverDropdownRef}
                className={
                    (open ? "block " : "hidden ") +
                    "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48"
                }
            >
                <button
                    onClick={irAlPerfil}
                    className="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700 text-left"
                >
                    {t("actualizar_perfil")}
                </button>
                <button
                    onClick={cerrarSesion}
                    className="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700 text-left"
                >
                    {t("cerrar_sesion")}
                </button>
            </div>
        </>
    );
};

export default UserDropdown;
