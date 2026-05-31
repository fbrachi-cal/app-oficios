// Import Firebase compatibility SDKs for the Service Worker environment
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase App in the Service Worker
firebase.initializeApp({
    apiKey: "AIzaSyC8gokmmf8rO3qooeP6w0P11tbQHyGCLB8",
    authDomain: "app-oficios-ffc35.firebaseapp.com",
    projectId: "app-oficios-ffc35",
    storageBucket: "app-oficios-ffc35.firebasestorage.app",
    messagingSenderId: "268088580056",
    appId: "1:268088580056:web:e7f02e7970c188a994c4ad",
    measurementId: "G-7KKVJCDMP1"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || 'Casa Click';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: '/favicon-32x32.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
