import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from "firebase/storage"; 
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyC8gokmmf8rO3qooeP6w0P11tbQHyGCLB8",
    authDomain: "app-oficios-ffc35.firebaseapp.com",
    projectId: "app-oficios-ffc35",
    storageBucket: "app-oficios-ffc35.firebasestorage.app",
    messagingSenderId: "268088580056",
    appId: "1:268088580056:web:e7f02e7970c188a994c4ad",
    measurementId: "G-7KKVJCDMP1"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (import.meta.env.MODE === 'development' && import.meta.env.VITE_FIREBASE_DISABLE_APP_VERIFICATION === 'true') {
    (auth as any).settings.appVerificationDisabledForTesting = true;
}

console.log("[Firebase Init Log]", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    origin: typeof window !== 'undefined' ? window.location.origin : null,
    hostname: typeof window !== 'undefined' ? window.location.hostname : null,
    appVerificationDisabled: (auth as any).settings.appVerificationDisabledForTesting || false
});

export const storage = getStorage(app); 

export const messagingPromise = isSupported().then((supported) => {
  return supported ? getMessaging(app) : null;
});

