// src/utils/subirImagenPerfil.ts
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const subirImagenPerfil = async (file: File, userId: string) => {
    const storageRef = ref(storage, `fotos_perfil/${userId}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
};
