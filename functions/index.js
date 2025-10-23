/**
 * Firebase Cloud Functions for E-Responde Mobile App
 * 
 * This file contains Cloud Functions that handle push notifications via FCM.
 * When a notification is created in Firestore, it automatically triggers
 * a push notification to the user's device.
 * 
 * Dependencies:
 * - firebase-admin
 * - firebase-functions
 * 
 * Setup:
 * 1. Install dependencies: npm install firebase-admin firebase-functions
 * 2. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function: Send Push Notification
 * 
 * Triggered when a new notification document is created in the 'notifications' collection.
 * This function sends a push notification to the user's device via FCM.
 * 
 * Expected notification document structure:
 * {
 *   toUserId: string,        // User ID to send notification to
 *   type: string,           // Notification type (sos_alert, crime_report_new, etc.)
 *   title: string,          // Notification title
 *   body: string,           // Notification body/message
 *   data: object,           // Additional data payload
 *   timestamp: string,      // ISO timestamp
 *   read: boolean           // Read status
 * }
 */
exports.sendPushNotification = functions
  .runWith({
    timeoutSeconds: 10, // Reduced timeout for faster execution
    memory: '256MB' // Optimized memory allocation
  })
  .firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const startTime = Date.now();
    console.log('Cloud Function: ⚡ Processing notification:', context.params.notificationId);
    
    try {
      const notification = snapshot.data();
      
      // Fast validation - fail quickly if invalid
      if (!notification.toUserId || !notification.title || !notification.body) {
        console.error('Cloud Function: ❌ Missing required fields');
        return null;
      }

      // Optimized FCM token retrieval with caching
      const userRef = admin.firestore().collection('users').doc(notification.toUserId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.error('Cloud Function: ❌ User not found:', notification.toUserId);
        return null;
      }
      
      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.error('Cloud Function: ❌ No FCM token for user:', notification.toUserId);
        return null;
      }
      
      console.log('Cloud Function: ✅ FCM token found, sending notification...');

      // Optimized FCM message creation
      const isSOSAlert = notification.type === 'sos_alert';
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        android: {
          priority: 'high', // Always high priority for faster delivery
          ttl: isSOSAlert ? 0 : 3600, // SOS alerts: immediate, others: 1 hour
          notification: {
            sound: 'default',
            channelId: isSOSAlert ? 'e-responde-sos' : 'e-responde-notifications',
            icon: 'ic_notification',
            color: isSOSAlert ? '#FF0000' : '#FF6B35',
            priority: 'high',
            defaultSound: true,
            ...(isSOSAlert && {
              vibrate: [0, 250, 250, 250],
              lightSettings: {
                color: { red: 1.0, green: 0.0, blue: 0.0, alpha: 1.0 },
                lightOnDurationMillis: 1000,
                lightOffDurationMillis: 1000
              }
            })
          }
        },
        data: {
          type: notification.type || 'general',
          notificationId: context.params.notificationId,
          userId: notification.toUserId,
          timestamp: notification.timestamp || new Date().toISOString(),
          ...(notification.data && Object.keys(notification.data).reduce((acc, key) => {
            acc[key] = String(notification.data[key]);
            return acc;
          }, {}))
        }
      };

      // Send FCM message with enhanced debugging
      console.log('Cloud Function: 📤 Sending FCM message:', JSON.stringify(message, null, 2));
      
      const response = await admin.messaging().send(message, false); // Dry run disabled for actual delivery
      
      const executionTime = Date.now() - startTime;
      console.log(`Cloud Function: ⚡ Push notification sent in ${executionTime}ms:`, response);
      console.log('Cloud Function: 📱 FCM Response details:', {
        success: !!response,
        messageId: response,
        token: fcmToken.substring(0, 20) + '...',
        channelId: message.android.notification.channelId,
        priority: message.android.priority
      });
      
      // Async update - don't wait for it
      snapshot.ref.update({
        fcmMessageId: response,
        delivered: true,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        executionTime: executionTime
      }).catch(err => console.error('Cloud Function: Error updating delivery status:', err));
      
      return response;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Cloud Function: ❌ Error after ${executionTime}ms:`, error);
      
      // Async error update - don't wait for it
      snapshot.ref.update({
        delivered: false,
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        executionTime: executionTime
      }).catch(updateError => console.error('Cloud Function: Error updating error status:', updateError));
      
      return null;
    }
  });

/**
 * Cloud Function: Send SOS Alert Push Notifications
 * 
 * This function can be called directly to send SOS alerts to multiple users.
 * It's useful for emergency situations where you need to send notifications
 * to multiple emergency contacts at once.
 * 
 * Usage:
 * - Call this function from your app when an SOS alert is triggered
 * - Pass an array of user IDs and the SOS alert data
 */
exports.sendSOSAlertNotifications = functions
  .runWith({
    timeoutSeconds: 15, // Faster timeout for SOS alerts
    memory: '512MB' // More memory for batch processing
  })
  .https
  .onCall(async (data, context) => {
    const startTime = Date.now();
    console.log('Cloud Function: ⚡ Sending SOS alert notifications:', data);
    
    try {
      // Fast validation
      if (!data.userIds || !Array.isArray(data.userIds) || data.userIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'userIds array is required');
      }
      
      if (!data.sosData) {
        throw new functions.https.HttpsError('invalid-argument', 'sosData is required');
      }
      
      const { userIds, sosData } = data;
      
      // Optimized batch user retrieval
      const userRefs = userIds.map(userId => 
        admin.firestore().collection('users').doc(userId)
      );
      
      const userDocs = await Promise.all(
        userRefs.map(ref => ref.get())
      );
      
      // Create optimized FCM messages
      const messages = [];
      const validUsers = [];
      
      for (let i = 0; i < userDocs.length; i++) {
        const userDoc = userDocs[i];
        const userId = userIds[i];
        
        if (userDoc.exists) {
          const fcmToken = userDoc.data()?.fcmToken;
          
          if (fcmToken) {
            validUsers.push(userId);
            
            // Optimized SOS message
            messages.push({
              token: fcmToken,
              notification: {
                title: '🚨 SOS Alert',
                body: `Emergency SOS alert from ${sosData.fromUserName || 'Unknown'}`,
              },
              data: {
                type: 'sos_alert',
                fromUserId: sosData.fromUserId,
                fromUserName: sosData.fromUserName || 'Unknown',
                fromUserPhone: sosData.fromUserPhone || 'Not available',
                location: JSON.stringify(sosData.location || {}),
                timestamp: sosData.timestamp || new Date().toISOString(),
                isTest: String(sosData.isTest || false)
              },
              android: {
                priority: 'high',
                ttl: 0, // Immediate delivery for SOS
                notification: {
                  sound: 'default',
                  channelId: 'e-responde-sos',
                  icon: 'ic_notification',
                  color: '#FF0000',
                  priority: 'high',
                  defaultSound: true,
                  vibrate: [0, 250, 250, 250],
                  lightSettings: {
                    color: { red: 1.0, green: 0.0, blue: 0.0, alpha: 1.0 },
                    lightOnDurationMillis: 1000,
                    lightOffDurationMillis: 1000
                  }
                }
              }
            });
          }
        }
      }
      
      // Send all messages with optimized batch processing
      if (messages.length > 0) {
        console.log(`Cloud Function: ⚡ Sending ${messages.length} SOS alert messages`);
        const response = await admin.messaging().sendAll(messages);
        
        const executionTime = Date.now() - startTime;
        console.log(`Cloud Function: ⚡ SOS alerts sent in ${executionTime}ms:`, response.successCount, 'successful,', response.failureCount, 'failed');
        
        return {
          success: true,
          sentTo: response.successCount,
          failed: response.failureCount,
          validUsers: validUsers,
          executionTime: executionTime,
          errors: response.responses
            .map((resp, index) => resp.error ? `User ${validUsers[index]}: ${resp.error.message}` : null)
            .filter(Boolean)
        };
      } else {
        console.log('Cloud Function: No valid FCM tokens found');
        return {
          success: false,
          sentTo: 0,
          failed: 0,
          error: 'No valid FCM tokens found'
        };
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Cloud Function: ❌ Error after ${executionTime}ms:`, error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Cloud Function: Clean Up Old Notifications
 * 
 * This function runs daily to clean up old notifications and maintain
 * database performance. It removes notifications older than 30 days.
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('0 2 * * *') // Run daily at 2 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Cloud Function: Starting cleanup of old notifications');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldNotifications = await admin.firestore()
        .collection('notifications')
        .where('timestamp', '<', thirtyDaysAgo.toISOString())
        .limit(500) // Process in batches
        .get();
      
      if (oldNotifications.empty) {
        console.log('Cloud Function: No old notifications to clean up');
        return null;
      }
      
      const batch = admin.firestore().batch();
      oldNotifications.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log('Cloud Function: ✅ Cleaned up', oldNotifications.size, 'old notifications');
      return null;
      
    } catch (error) {
      console.error('Cloud Function: Error cleaning up old notifications:', error);
      return null;
    }
  });

/**
 * Cloud Function: Update User FCM Token
 * 
 * This function can be called to update a user's FCM token.
 * Useful when the token is refreshed on the client side.
 */
exports.updateUserFCMToken = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { fcmToken } = data;
    const userId = context.auth.uid;
    
    if (!fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'fcmToken is required');
    }
    
    // Update user's FCM token
    await admin.firestore().collection('users').doc(userId).update({
      fcmToken: fcmToken,
      fcmTokenUpdated: admin.firestore.FieldValue.serverTimestamp(),
      platform: data.platform || 'unknown'
    });
    
    console.log('Cloud Function: ✅ Updated FCM token for user:', userId);
    
    return { success: true };
    
  } catch (error) {
    console.error('Cloud Function: Error updating FCM token:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
