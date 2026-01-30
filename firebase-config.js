// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyAUnUCgbxgLghA2IzLdhv7F-9KGVB7O7D0",
    authDomain: "arigato-journal.firebaseapp.com",
    projectId: "arigato-journal",
    storageBucket: "arigato-journal.firebasestorage.app",
    messagingSenderId: "262613462976",
    appId: "1:262613462976:web:ee5824eece6a90e18e6225"
};

// Enable offline persistence with new API to silence deprecation warning
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getMessaging } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
const messaging = getMessaging(app);

// Remove old deprecated call
// enableIndexedDbPersistence(db)...

export { db, messaging };
