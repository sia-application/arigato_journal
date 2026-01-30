importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAUnUCgbxgLghA2IzLdhv7F-9KGVB7O7D0",
    authDomain: "arigato-journal.firebaseapp.com",
    projectId: "arigato-journal",
    storageBucket: "arigato-journal.firebasestorage.app",
    messagingSenderId: "262613462976",
    appId: "1:262613462976:web:ee5824eece6a90e18e6225"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
