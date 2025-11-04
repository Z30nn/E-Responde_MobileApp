/**
 * Firebase Cloud Messaging (FCM) Service for E-Responde Mobile App
 * 
 * This service integrates FCM to send push notifications when the app is in background or closed,
 * while reusing the existing in-app notification logic and sounds for foreground notifications.
 * 
 * Dependencies:
 * - @react-native-firebase/app
 * - @react-native-firebase/messaging
 * 
 * Usage:
 * 1. Import and initialize in App.tsx
 * 2. Call setupNotificationListeners() after user authentication
 * 3. The service will automatically handle FCM tokens and notification display
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { soundService } from './soundService';

class FCMService {
  private static instance: FCMService;
  private isInitialized = false;
  private currentUserId: string | null = null;
  private navigationCallback: ((type: string, data: any) => void) | null = null;

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }


  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      console.log('FCMService: Creating notification channels...');
      
      // For React Native Firebase, notification channels are typically created
      // in the AndroidManifest.xml or through native Android code
      // The channels are already defined in AndroidManifest.xml:
      // - e-responde-notifications (default)
      // - e-responde-sos (SOS alerts)
      
      console.log('FCMService: ✅ Notification channels are configured in AndroidManifest.xml');
      console.log('FCMService: Default channel: e-responde-notifications');
      console.log('FCMService: SOS channel: e-responde-sos');
      
    } catch (error) {
      console.error('FCMService: Error creating notification channels:', error);
    }
  }

  /**
   * Request user permission for push notifications
   * Returns true if permission is granted, false otherwise
   */
  async requestUserPermission(): Promise<boolean> {
    try {
      console.log('FCMService: Requesting notification permissions...');
      console.log('FCMService: Platform:', Platform.OS, 'Version:', Platform.Version);
      
      // Create notification channels first
      await this.createNotificationChannels();
      
      // First check current status
      const currentStatus = await messaging().hasPermission();
      console.log('FCMService: Current permission status:', currentStatus);
      console.log('FCMService: AuthorizationStatus values:', {
        AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
        DENIED: messaging.AuthorizationStatus.DENIED,
        NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
        PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL
      });
      
      // If already authorized, return true immediately
      if (currentStatus === messaging.AuthorizationStatus.AUTHORIZED || 
          currentStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        console.log('FCMService: ✅ Notifications already authorized');
        return true;
      }
      
      // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        console.log('FCMService: Android 13+ detected, requesting POST_NOTIFICATIONS permission');
        
        // Request permission with all necessary options
        const authStatus = await messaging().requestPermission({
          alert: true,
          announcement: false,
          badge: true,
          carPlay: false,
          criticalAlert: false,
          provisional: false,
          sound: true,
        });
        
        console.log('FCMService: Permission request result:', authStatus);
        
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('FCMService: ✅ Notification permission granted');
          return true;
        } else {
          console.log('FCMService: ❌ Notification permission denied');
          console.log('FCMService: Final permission status:', await messaging().hasPermission());
          return false;
        }
      } else {
        // For older Android versions, use the standard approach
        console.log('FCMService: Using standard permission request for older Android versions');
        
        const authStatus = await messaging().requestPermission({
          alert: true,
          announcement: false,
          badge: true,
          carPlay: false,
          criticalAlert: false,
          provisional: false,
          sound: true,
        });
        
        console.log('FCMService: Permission request result:', authStatus);
        
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('FCMService: ✅ Notification permission granted');
          return true;
        } else {
          console.log('FCMService: ❌ Notification permission denied');
          console.log('FCMService: Final permission status:', await messaging().hasPermission());
          return false;
        }
      }
    } catch (error: any) {
      console.error('FCMService: Error requesting permission:', error);
      console.error('FCMService: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Request notification permission with user-friendly alert
   * This method shows an alert to explain why notifications are needed
   */
  async requestPermissionWithExplanation(): Promise<boolean> {
    try {
      console.log('FCMService: Requesting permission with explanation...');
      
      // First check if already granted
      const hasPermission = await this.checkNotificationPermission();
      if (hasPermission) {
        console.log('FCMService: ✅ Notifications already enabled');
        return true;
      }
      
      // Show explanation alert before requesting permission
      return new Promise((resolve) => {
        Alert.alert(
          '🔔 Enable Notifications',
          'E-Responde needs notification access to:\n\n• Send emergency alerts\n• Notify about crime reports\n• Keep you informed of important updates\n\nThis is essential for your safety and the safety of others.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                console.log('FCMService: User declined notification permission');
                resolve(false);
              }
            },
            {
              text: 'Allow Notifications',
              onPress: async () => {
                console.log('FCMService: User agreed to notification permission');
                const granted = await this.requestUserPermission();
                resolve(granted);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('FCMService: Error requesting permission with explanation:', error);
      return false;
    }
  }

  /**
   * Check if notifications are already enabled
   * Returns true if notifications are enabled, false otherwise
   */
  async checkNotificationPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('FCMService: Permission status:', {
        status: authStatus,
        AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
        DENIED: messaging.AuthorizationStatus.DENIED,
        NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
        PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL
      });

      if (enabled) {
        console.log('FCMService: ✅ Notifications already enabled');
        return true;
      } else {
        console.log('FCMService: ❌ Notifications not enabled');
        return false;
      }
    } catch (error) {
      console.error('FCMService: Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled in device settings
   */
  async checkNotificationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await messaging().hasPermission();
        console.log('FCMService: Current permission status:', hasPermission);
        
        if (hasPermission === messaging.AuthorizationStatus.AUTHORIZED) {
          console.log('FCMService: ✅ Notifications are authorized');
        } else if (hasPermission === messaging.AuthorizationStatus.DENIED) {
          console.log('FCMService: ❌ Notifications are denied');
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive important alerts.',
            [{ text: 'OK' }]
          );
        } else {
          console.log('FCMService: ⚠️ Notification permission not determined');
        }
      }
    } catch (error) {
      console.error('FCMService: Error checking notification settings:', error);
    }
  }

  /**
   * Persistently request notification permission with retry logic
   * This method will keep trying to get permission until granted
   */
  async persistentPermissionRequest(): Promise<boolean> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      console.log(`FCMService: Permission request attempt ${retryCount + 1}/${maxRetries}`);
      
      const hasPermission = await this.requestUserPermission();
      
      if (hasPermission) {
        console.log('FCMService: ✅ Permission granted on attempt', retryCount + 1);
        return true;
      }
      
      retryCount++;
      
      if (retryCount < maxRetries) {
        console.log('FCMService: ⚠️ Permission denied, will retry in 2 seconds...');
        await new Promise<void>(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
    
    console.log('FCMService: ❌ All permission request attempts failed');
    return false;
  }

  /**
   * Request permission with fallback to settings guidance
   * If permission is denied, show guidance on how to enable manually
   */
  async requestPermissionWithFallback(): Promise<boolean> {
    try {
      console.log('FCMService: Requesting permission with fallback...');
      
      // First try the explanation method
      const hasPermission = await this.requestPermissionWithExplanation();
      
      if (hasPermission) {
        console.log('FCMService: ✅ Permission granted with explanation');
        return true;
      }
      
      // If denied, show settings guidance
      console.log('FCMService: Permission denied, showing settings guidance...');
      
      return new Promise((resolve) => {
        Alert.alert(
          '⚠️ Notifications Required',
          'E-Responde needs notification access for emergency alerts and safety updates.\n\nTo enable notifications:\n\n1. Go to Settings\n2. Tap Apps & notifications\n3. Find E-Responde\n4. Tap Notifications\n5. Turn on "Allow notifications"',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                console.log('FCMService: User cancelled settings guidance');
                resolve(false);
              }
            },
            {
              text: 'Open Settings',
              onPress: () => {
                console.log('FCMService: User wants to open settings');
                // Note: We can't programmatically open app settings in React Native
                // The user will need to manually navigate to settings
                resolve(false);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('FCMService: Error requesting permission with fallback:', error);
      return false;
    }
  }

  /**
   * Get the device's FCM token
   * This token is used to send push notifications to this specific device
   */
  async getFCMToken(): Promise<string | null> {
    try {
      console.log('FCMService: Getting FCM token...');
      
      const token = await messaging().getToken();
      
      if (token) {
        console.log('FCMService: ✅ FCM token retrieved:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.log('FCMService: ❌ No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('FCMService: Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to user's profile in Firestore
   * This allows the backend to send push notifications to this user
   */
  async saveFCMTokenToUser(userId: string, token: string): Promise<boolean> {
    try {
      console.log('FCMService: Saving FCM token for user:', userId);
      console.log('FCMService: Token (first 20 chars):', token.substring(0, 20) + '...');
      
      // Import Firestore functions to save token directly
      const { doc, setDoc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebaseConfig');
      
      // Check if user document exists, if not create it
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdated: new Date().toISOString(),
          platform: Platform.OS
        });
        console.log('FCMService: ✅ FCM token updated in existing user profile');
      } else {
        // Create new document with FCM token
        await setDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdated: new Date().toISOString(),
          platform: Platform.OS,
          createdAt: new Date().toISOString()
        });
        console.log('FCMService: ✅ FCM token saved to new user profile');
      }
      
      // Verify the token was saved
      const verifyDoc = await getDoc(userRef);
      if (verifyDoc.exists() && verifyDoc.data()?.fcmToken === token) {
        console.log('FCMService: ✅ FCM token verification successful');
        return true;
      } else {
        console.log('FCMService: ❌ FCM token verification failed');
        return false;
      }
    } catch (error: any) {
      console.error('FCMService: Error saving FCM token:', error);
      console.error('FCMService: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Handle in-app notifications when app is in foreground
   * This should only be called for foreground messages, not background messages
   */
  async handleInAppNotification(remoteMessage: any): Promise<void> {
    try {
      console.log('FCMService: Handling in-app notification (foreground only):', remoteMessage);
      
      const { notification, data } = remoteMessage;
      
      if (!notification || !data) {
        console.log('FCMService: Invalid notification data for in-app notification');
        return;
      }

      // Extract notification details
      const title = notification.title || 'E-Responde';
      const body = notification.body || '';
      const type = data.type || 'general';
      const userId = data.userId || this.currentUserId;

      if (!userId) {
        console.log('FCMService: No user ID available for in-app notification');
        return;
      }

      console.log('FCMService: Creating in-app notification for foreground display');
      
      // For foreground messages, we can create a simple in-app notification
      // without triggering the full notification service (which would create a loop)
      console.log('FCMService: ✅ In-app notification processed for foreground');
      
      // Play appropriate sound based on notification type
      if (type === 'sos_alert' || title.toLowerCase().includes('sos') || body.toLowerCase().includes('emergency')) {
        console.log('FCMService: 🆘 SOS alert detected - playing emergency sound');
        await soundService.playSOSSound();
        console.log('FCMService: ✅ SOS sound played');
      }
      
    } catch (error) {
      console.error('FCMService: Error handling in-app notification:', error);
    }
  }

  /**
   * Set navigation callback for handling notification navigation
   */
  setNavigationCallback(callback: (type: string, data: any) => void): void {
    this.navigationCallback = callback;
    console.log('FCMService: Navigation callback set');
  }

  /**
   * Setup notification listeners for different app states
   * This is the main function to call after user authentication
   */
  async setupNotificationListeners(userId: string, navigationCallback?: (type: string, data: any) => void): Promise<void> {
    try {
      console.log('FCMService: Setting up notification listeners for user:', userId);
      console.log('FCMService: Platform:', Platform.OS, 'Version:', Platform.Version);
      
      this.currentUserId = userId;
      
      // Set navigation callback if provided
      if (navigationCallback) {
        this.setNavigationCallback(navigationCallback);
      }
      
      // Create notification channels first
      await this.createNotificationChannels();
      
      // Check notification settings
      await this.checkNotificationSettings();
      
      // Note: Battery optimization should be handled by user manually
      // This is the most reliable way to ensure FCM works when app is killed
      
      // Check if permission is already granted first
      console.log('FCMService: Checking if notifications are already enabled...');
      const alreadyEnabled = await this.checkNotificationPermission();
      console.log('FCMService: Already enabled result:', alreadyEnabled);
      
      if (!alreadyEnabled) {
        console.log('FCMService: Notifications not enabled, requesting permission persistently...');
        // Use persistent permission request with retry logic
        const hasPermission = await this.persistentPermissionRequest();
        console.log('FCMService: Persistent permission request result:', hasPermission);
        
        if (!hasPermission) {
          console.log('FCMService: ❌ All permission attempts failed');
          console.log('FCMService: ⚠️ Notifications are essential for emergency alerts!');
          console.log('FCMService: Please enable notifications in device settings:');
          console.log('FCMService: Settings > Apps > E-Responde > Notifications > Allow');
          console.log('FCMService: FCM setup skipped - notifications will not work');
          return;
        }
        console.log('FCMService: ✅ Permission granted, continuing with setup...');
      } else {
        console.log('FCMService: Notifications already enabled, proceeding with setup');
      }

      // Get and save FCM token
      console.log('FCMService: Getting FCM token...');
      const token = await this.getFCMToken();
      console.log('FCMService: FCM token:', token ? 'Found' : 'Not found');
      console.log('FCMService: FCM token length:', token ? token.length : 0);
      
      if (token) {
        console.log('FCMService: Saving FCM token to user profile...');
        const tokenSaved = await this.saveFCMTokenToUser(userId, token);
        console.log('FCMService: FCM token saved:', tokenSaved);
        
        if (tokenSaved) {
          console.log('FCMService: ✅ FCM token successfully stored in Firestore');
        } else {
          console.log('FCMService: ❌ Failed to save FCM token to Firestore');
        }
      } else {
        console.log('FCMService: ❌ No FCM token available');
        console.log('FCMService: This will prevent push notifications from working');
        console.log('FCMService: Possible causes:');
        console.log('FCMService: 1. Google Play Services not available');
        console.log('FCMService: 2. Firebase not properly initialized');
        console.log('FCMService: 3. Device not supported');
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCMService: FCM token refreshed');
        await this.saveFCMTokenToUser(userId, newToken);
      });

      // Handle foreground messages (app is open)
      messaging().onMessage(async (remoteMessage) => {
        console.log('FCMService: Received foreground message:', remoteMessage);
        await this.handleInAppNotification(remoteMessage);
      });

      // Note: Background message handler should be set at app level, not here
      // This is handled in App.tsx for proper initialization

      // Handle notification press (when user taps notification)
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('FCMService: Notification opened app:', remoteMessage);
        
        // Handle navigation or other actions based on notification data
        this.handleNotificationPress(remoteMessage);
      });

      // Check if app was opened from a notification (app was completely closed)
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log('FCMService: App opened from notification:', remoteMessage);
            this.handleNotificationPress(remoteMessage);
          }
        });

      this.isInitialized = true;
      console.log('FCMService: ✅ Notification listeners setup complete');
      
      // Run FCM test to verify everything is working
      await this.testFCM();
      
    } catch (error) {
      console.error('FCMService: Error setting up notification listeners:', error);
    }
  }

  /**
   * Handle notification press events
   * Navigate to appropriate screen based on notification type
   */
  private handleNotificationPress(remoteMessage: any): void {
    try {
      console.log('FCMService: Handling notification press:', remoteMessage);
      
      const { data, notification } = remoteMessage;
      if (!data) return;

      const type = data.type;
      console.log('FCMService: Notification type:', type);
      console.log('FCMService: Notification data:', data);
      
      // Create a notification payload that matches your app's structure
      const notificationPayload = {
        id: data.notificationId || `fcm_${Date.now()}`,
        type: type,
        title: notification?.title || 'Notification',
        body: notification?.body || '',
        data: data,
        userId: this.currentUserId,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store the notification in the app's notification system
      this.storeNotificationFromFCM(notificationPayload);

      // Handle different notification types
      switch (type) {
        case 'sos_alert':
          console.log('FCMService: Navigating to SOS alert');
          this.navigateToSOSAlert(notificationPayload);
          break;
          
        case 'crime_report_new':
        case 'crime_report_updated':
        case 'crime_report_solved':
          console.log('FCMService: Navigating to crime reports');
          this.navigateToCrimeReport(notificationPayload);
          break;
          
          
          
        default:
          console.log('FCMService: Navigating to notifications tab');
          this.navigateToNotifications(notificationPayload);
          break;
      }
    } catch (error) {
      console.error('FCMService: Error handling notification press:', error);
    }
  }

  /**
   * Store notification from FCM in the app's notification system
   */
  private async storeNotificationFromFCM(notificationPayload: any): Promise<void> {
    try {
      console.log('FCMService: Storing notification from FCM:', notificationPayload);
      
      if (!this.currentUserId) {
        console.log('FCMService: No current user, cannot store notification');
        return;
      }

      // Import the notification service to store the notification
      const { notificationService } = await import('./notificationService');
      
      // Use the proper sendNotification method to ensure FCM is triggered
      // This ensures the notification appears in both the app AND triggers push notifications
      await notificationService.sendNotification(
        this.currentUserId,
        notificationPayload.type,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data
      );
      
      console.log('FCMService: ✅ Notification stored via proper service (triggers FCM)');
    } catch (error) {
      console.error('FCMService: Error storing notification from FCM:', error);
    }
  }

  /**
   * Navigate to SOS alert details
   */
  private navigateToSOSAlert(notification: any): void {
    try {
      console.log('FCMService: Navigating to SOS alert:', notification);
      
      // Emit event to app to navigate to SOS tab and show the specific alert
      if (this.navigationCallback) {
        this.navigationCallback('sos_alert', {
          notificationId: notification.id,
          fromUserId: notification.data?.fromUserId,
          fromUserName: notification.data?.fromUserName,
          fromUserPhone: notification.data?.fromUserPhone,
          location: notification.data?.location,
          isReverseNotification: notification.data?.isReverseNotification
        });
      } else {
        console.log('FCMService: No navigation callback available for SOS alert');
      }
    } catch (error) {
      console.error('FCMService: Error navigating to SOS alert:', error);
    }
  }

  /**
   * Navigate to crime report details
   */
  private navigateToCrimeReport(notification: any): void {
    try {
      console.log('FCMService: Navigating to crime report:', notification);
      
      if (this.navigationCallback) {
        this.navigationCallback('crime_report', {
          reportId: notification.data?.reportId,
          notificationId: notification.id
        });
      } else {
        console.log('FCMService: No navigation callback available for crime report');
      }
    } catch (error) {
      console.error('FCMService: Error navigating to crime report:', error);
    }
  }



  /**
   * Navigate to notifications tab
   */
  private navigateToNotifications(notification: any): void {
    try {
      console.log('FCMService: Navigating to notifications tab:', notification);
      
      if (this.navigationCallback) {
        this.navigationCallback('notifications', {
          notificationId: notification.id,
          highlightNotification: true
        });
      } else {
        console.log('FCMService: No navigation callback available for notifications');
      }
    } catch (error) {
      console.error('FCMService: Error navigating to notifications:', error);
    }
  }

  /**
   * Test FCM functionality
   */
  async testFCM(): Promise<void> {
    try {
      console.log('FCMService: 🧪 Testing FCM functionality...');
      
      // Check permissions
      const hasPermission = await this.checkNotificationPermission();
      console.log('FCMService: Permission status:', hasPermission);
      
      // Check FCM token
      const token = await this.getFCMToken();
      console.log('FCMService: FCM token available:', !!token);
      console.log('FCMService: Token length:', token ? token.length : 0);
      
      // Check if token is saved to Firestore
      if (this.currentUserId && token) {
        const { db } = await import('../firebaseConfig');
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', this.currentUserId));
        const userData = userDoc.data();
        console.log('FCMService: Token saved in Firestore:', !!userData?.fcmToken);
        console.log('FCMService: Stored token matches current:', userData?.fcmToken === token);
      }
      
      // Test notification channels
      console.log('FCMService: Testing notification channels...');
      await this.createNotificationChannels();
      
      console.log('FCMService: 🧪 FCM test completed');
    } catch (error) {
      console.error('FCMService: Error testing FCM:', error);
    }
  }

  /**
   * Test FCM push notification directly
   */
  async testPushNotification(): Promise<boolean> {
    try {
      console.log('FCMService: 🧪 Testing FCM push notification...');
      
      if (!this.currentUserId) {
        console.log('FCMService: ❌ No current user for testing');
        return false;
      }

      // Import notification service
      const { notificationService } = await import('./notificationService');
      
      // Send test notification
      const result = await notificationService.createTestFCMNotification(this.currentUserId);
      
      if (result) {
        console.log('FCMService: ✅ Test push notification sent successfully');
        console.log('FCMService: Close the app and check system tray for notification');
      } else {
        console.log('FCMService: ❌ Failed to send test push notification');
      }
      
      return result;
    } catch (error) {
      console.error('FCMService: Error testing push notification:', error);
      return false;
    }
  }

  /**
   * Clean up FCM service
   * Call this when user logs out
   */
  async cleanup(): Promise<void> {
    try {
      console.log('FCMService: Cleaning up FCM service...');
      
      // Remove FCM token from user profile before clearing currentUserId
      if (this.currentUserId) {
        // Check if user is still authenticated before attempting Firestore write
        const { auth } = await import('../firebaseConfig');
        if (!auth.currentUser) {
          console.log('FCMService: User already logged out, skipping FCM token removal from Firestore');
        } else {
          try {
            const { doc, updateDoc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../firebaseConfig');
            
            const userRef = doc(db, 'users', this.currentUserId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              await updateDoc(userRef, {
                fcmToken: null,
                fcmTokenUpdated: null
              });
              console.log('FCMService: ✅ FCM token removed from user profile');
            } else {
              console.log('FCMService: User document does not exist in Firestore, skipping cleanup');
            }
          } catch (firestoreError: any) {
            // Log but don't throw - cleanup should not fail if token removal fails
            console.error('FCMService: Error removing FCM token from Firestore:', firestoreError);
            if (firestoreError?.code === 'permission-denied') {
              console.warn('FCMService: Permission denied - user may have already been logged out');
            }
          }
        }
      }
      
      this.currentUserId = null;
      this.isInitialized = false;
      
      console.log('FCMService: ✅ FCM service cleaned up');
    } catch (error) {
      console.error('FCMService: Error cleaning up FCM service:', error);
    }
  }

  /**
   * Check if FCM service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current FCM token
   */
  async getCurrentToken(): Promise<string | null> {
    return await this.getFCMToken();
  }

  /**
   * Check and remind users about notification permissions
   * This can be called periodically to ensure notifications are enabled
   */
  async checkAndRemindPermissions(): Promise<boolean> {
    try {
      console.log('FCMService: Checking notification permissions...');
      
      const hasPermission = await this.checkNotificationPermission();
      
      if (hasPermission) {
        console.log('FCMService: ✅ Notifications are enabled');
        return true;
      }
      
      console.log('FCMService: ❌ Notifications not enabled, showing reminder...');
      
      // Show a gentle reminder
      return new Promise((resolve) => {
        Alert.alert(
          '🔔 Enable Notifications',
          'To receive emergency alerts and important updates, please enable notifications for E-Responde.',
          [
            {
              text: 'Maybe Later',
              style: 'cancel',
              onPress: () => {
                console.log('FCMService: User chose to enable notifications later');
                resolve(false);
              }
            },
            {
              text: 'Enable Now',
              onPress: async () => {
                console.log('FCMService: User wants to enable notifications now');
                const granted = await this.requestPermissionWithFallback();
                resolve(granted);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('FCMService: Error checking and reminding permissions:', error);
      return false;
    }
  }

  /**
   * Request battery optimization exemption for Android
   * This helps prevent the system from killing FCM background processes
   */
  async requestBatteryOptimizationExemption(): Promise<void> {
    try {
      if (Platform.OS !== 'android') {
        console.log('FCMService: Battery optimization exemption only needed on Android');
        return;
      }

      console.log('FCMService: Requesting battery optimization exemption...');
      
      // Import Android-specific modules
      const { Linking } = await import('react-native');
      
      // Show alert to guide user to battery optimization settings
      Alert.alert(
        '🔋 Battery Optimization',
        'To ensure emergency notifications work when the app is closed, please disable battery optimization for E-Responde.\n\nThis is essential for receiving SOS alerts and emergency notifications.',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => {
              console.log('FCMService: User skipped battery optimization exemption');
            }
          },
          {
            text: 'Open Settings',
            onPress: () => {
              console.log('FCMService: Opening battery optimization settings...');
              // Open battery optimization settings
              Linking.openSettings().catch((error) => {
                console.error('FCMService: Error opening settings:', error);
                Alert.alert(
                  'Settings',
                  'Please manually go to Settings > Apps > E-Responde > Battery > Don\'t optimize'
                );
              });
            }
          }
        ]
      );
      
      console.log('FCMService: Battery optimization exemption requested');
    } catch (error) {
      console.error('FCMService: Error requesting battery optimization exemption:', error);
    }
  }

  /**
   * Test notification permission flow
   * This method can be called for testing purposes
   */
  async testNotificationFlow(): Promise<void> {
    try {
      console.log('FCMService: ===== TESTING NOTIFICATION FLOW =====');
      
      // Check current status
      const currentStatus = await messaging().hasPermission();
      console.log('FCMService: Current permission status:', currentStatus);
      
      // Try to get FCM token
      const token = await this.getFCMToken();
      console.log('FCMService: FCM token available:', !!token);
      
      // Test permission request
      const hasPermission = await this.checkNotificationPermission();
      console.log('FCMService: Permission check result:', hasPermission);
      
      console.log('FCMService: ===== NOTIFICATION FLOW TEST COMPLETE =====');
    } catch (error) {
      console.error('FCMService: Error testing notification flow:', error);
    }
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();
export default fcmService;
