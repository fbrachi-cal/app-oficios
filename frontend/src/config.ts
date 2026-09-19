const DEFAULT_PUBLIC_URL = "https://casaclick.app";

const config = {
    apiBaseUrl: import.meta.env.VITE_API_URL,
    appVersion: import.meta.env.VITE_APP_VERSION,
    publicUrl: import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_LANDING_URL || DEFAULT_PUBLIC_URL,
};

export default config;
  