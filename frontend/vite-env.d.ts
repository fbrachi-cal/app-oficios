/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // otras variables VITE_... si querés
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
