/**
 * Direct FCM Service - No Cloud Functions Required
 * 
 * This service sends FCM messages directly from the client without requiring
 * Firebase Cloud Functions or the Blaze plan.
 * 
 * Note: This approach has limitations:
 * - Requires FCM server key (less secure)
 * - Limited to 1000 messages/day on free plan
 * - No server-side processing
 */

import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

class DirectFCMService {
  private static instance: DirectFCMService;
  private isInitialized = false;
  private currentUserId: string | null = null;

  public static getInstance(): DirectFCMService {
    if (!DirectFCMService.instance) {
      DirectFCMService.instance = new DirectFCMService();
    }
    return DirectFCMService.instance;
  }

  /**
   * Send FCM message directly from client
   * This bypasses Cloud Functions but requires FCM server key
   */
  async sendDirectFCMNotification(
    targetUserId: string,
    title: string,
    body: string,
    data: any = {},
    type: string = 'general'
  ): Promise<boolean> {
    try {
      console.log('DirectFCMService: Sending direct FCM notification');
      
      // Get target user's FCM token from Firestore
      const { FirebaseService } = await import('./firebaseService');
      const userDoc = await FirebaseService.getUserDocument(targetUserId);
      
      if (!userDoc || !userDoc.fcmToken) {
        console.log('DirectFCMService: No FCM token for target user');
        return false;
      }

      // Create FCM message payload
      const message = {
        to: userDoc.fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: {
          type: type,
          ...data
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'e-responde-notifications',
            // For SOS alerts, use high priority
            ...(type === 'sos_alert' && {
              priority: 'high',
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              lightSettings: {
                color: {
                  red: 1.0,
                  green: 0.0,
                  blue: 0.0,
                  alpha: 1.0
                },
                lightOnDurationMillis: 1000,
                lightOffDurationMillis: 1000
              }
            })
          }
        }
      };

      // Send via FCM REST API
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`, // You'll need to add this
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('DirectFCMService: ✅ Direct FCM notification sent');
        return true;
      } else {
        console.error('DirectFCMService: ❌ Failed to send FCM notification');
        return false;
      }

    } catch (error) {
      console.error('DirectFCMService: Error sending direct FCM:', error);
      return false;
    }
  }

  /**
   * Initialize direct FCM service
   */
  async initialize(userId: string): Promise<void> {
    try {
      console.log('DirectFCMService: Initializing direct FCM service');
      
      this.currentUserId = userId;
      
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('DirectFCMService: Notification permission denied');
        return;
      }

      // Get and save FCM token
      const token = await messaging().getToken();
      if (token) {
        console.log('DirectFCMService: FCM token retrieved');
        
        // Save token to user profile
        const { FirebaseService } = await import('./firebaseService');
        await FirebaseService.updateUserProfile(userId, {
          fcmToken: token,
          fcmTokenUpdated: new Date().toISOString(),
          platform: Platform.OS
        });
      }

      this.isInitialized = true;
      console.log('DirectFCMService: ✅ Direct FCM service initialized');
      
    } catch (error) {
      console.error('DirectFCMService: Error initializing:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export const directFCMService = DirectFCMService.getInstance();
export default directFCMService;
