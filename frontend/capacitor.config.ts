import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.VITE_API_URL?.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'ar.casaclick.app',
  appName: 'CasaClick',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
  ...(isDev ? {
    server: {
      cleartext: true,
      androidScheme: 'http',
    },
    android: {
      allowMixedContent: true,
    }
  } : {})
};

export default config;
