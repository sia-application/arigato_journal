import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-sw.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUnUCgbxgLghA2IzLdhv7F-9KGVB7O7D0",
    authDomain: "arigato-journal.firebaseapp.com",
    projectId: "arigato-journal",
    storageBucket: "arigato-journal.firebasestorage.app",
    messagingSenderId: "262613462976",
    appId: "1:262613462976:web:ee5824eece6a90e18e6225"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'arigato-journal-v1';
const ASSETS = [
    './',
    './index.html',
    './top.html',
    './register.html',
    './styles.css',
    './app.js',
    './firebase-config.js',
    './assets/logo.png',
    'manifest.json'
];

// Install event: Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS);
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch event: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Notification click event: Open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./top.html')
    );
});
