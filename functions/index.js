const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggers when a new message is created in the 'messages' collection.
 * Sends a Push Notification to the recipient.
 */
exports.sendNotificationOnMessage = functions.firestore
    .document('messages/{messageId}')
    .onCreate(async (snap, context) => {
        const messageData = snap.data();
        const recipientId = messageData.toId;
        const senderName = messageData.fromName || "誰か";
        const messageText = messageData.message || "メッセージが届いています";

        // Don't notify if sending to self (shouldn't happen usually but good check)
        if (recipientId === messageData.fromId) return null;

        // Get Recipient's FCM Token from Firestore
        const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
        if (!userDoc.exists) {
            console.log(`User ${recipientId} not found`);
            return null;
        }

        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (!fcmToken) {
            console.log(`No FCM token for user ${recipientId}`);
            return null;
        }

        // Construct Notification Payload
        const payload = {
            notification: {
                title: `ありがとうが届きました！`,
                body: `${senderName}さん: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`
            },
            webpush: {
                fcm_options: {
                    link: 'https://arigato-journal.web.app/'
                },
                notification: {
                    icon: '/assets/logo.png',
                    badge: '/assets/logo.png'
                }
            },
            token: fcmToken
        };

        try {
            const response = await admin.messaging().send(payload);
            console.log('Successfully sent message:', response);
            return response;
        } catch (error) {
            console.log('Error sending message:', error);
            // Cleanup invalid tokens if needed, but keeping it simple for now
            return null;
        }
    });
