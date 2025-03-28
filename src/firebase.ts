import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
