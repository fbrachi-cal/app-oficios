/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // agregá más variables si es necesario
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  