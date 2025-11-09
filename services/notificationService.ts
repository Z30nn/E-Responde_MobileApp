import { database } from '../firebaseConfig';
import { ref, set, get, update, push, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import {
  NotificationPayload,
  NotificationType,
  NotificationSettings,
  NotificationPreferences,
  defaultNotificationPreferences,
} from './types/notification-types';

// Translation helper function
const getTranslation = (key: string, language: string = 'en'): string => {
  const translations: { [key: string]: { [key: string]: string } } = {
    en: {
      'notifications.reportResolved': 'Report Resolved',
      'notifications.reportResolvedBody': 'Your report "{title}" has been resolved!',
      'notifications.reportResolvedBodyGeneric': 'Your crime report has been resolved!',
      'notifications.reportStatusUpdated': 'Report Status Updated',
      'notifications.reportStatusUpdatedBody': 'Your report "{title}" status has been updated to {status}',
      'notifications.reportStatusUpdatedBodyGeneric': 'Your crime report status has been updated to {status}',
      'notifications.reportStatusChangedBody': 'Your report "{title}" status has been updated from {oldStatus} to {newStatus}',
      'notifications.reportStatusChangedBodyGeneric': 'Your crime report status has been updated from {oldStatus} to {newStatus}',
    },
    fil: {
      'notifications.reportResolved': 'Nalutas na ang Report',
      'notifications.reportResolvedBody': 'Nalutas na ang inyong report na "{title}"!',
      'notifications.reportResolvedBodyGeneric': 'Nalutas na ang inyong crime report!',
      'notifications.reportStatusUpdated': 'Na-update ang Status ng Report',
      'notifications.reportStatusUpdatedBody': 'Na-update ang status ng inyong report na "{title}" sa {status}',
      'notifications.reportStatusUpdatedBodyGeneric': 'Na-update ang status ng inyong crime report sa {status}',
      'notifications.reportStatusChangedBody': 'Na-update ang status ng inyong report na "{title}" mula {oldStatus} patungong {newStatus}',
      'notifications.reportStatusChangedBodyGeneric': 'Na-update ang status ng inyong crime report mula {oldStatus} patungong {newStatus}',
    }
  };
  
  return translations[language]?.[key] || translations['en'][key] || key;
};

export class NotificationService {
  private static instance: NotificationService;
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private cloneDefaultPreferences(): NotificationPreferences {
    return JSON.parse(JSON.stringify(defaultNotificationPreferences));
  }

  /**
   * Get user's notification preferences
   */
  async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
    const settingsRef = ref(database, `notificationSettings/${userId}`);
    const snapshot = await get(settingsRef);

    if (snapshot.exists()) {
      return snapshot.val() as NotificationSettings;
    }

    const defaultSettings: NotificationSettings = {
      userId,
      preferences: this.cloneDefaultPreferences(),
      lastUpdated: new Date().toISOString(),
    };

    await set(settingsRef, defaultSettings);
    return defaultSettings;
  }

  /**
   * Update user's notification settings
   */
  async updateUserNotificationSettings(userId: string, settings: NotificationSettings): Promise<NotificationSettings> {
    const settingsRef = ref(database, `notificationSettings/${userId}`);
    const payload: NotificationSettings = {
      ...settings,
      userId,
      lastUpdated: new Date().toISOString(),
    };
    await set(settingsRef, payload);
    return payload;
  }

  /**
   * Update specific notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationSettings> {
    const currentSettings = await this.getUserNotificationSettings(userId);
    const mergedPreferences: NotificationPreferences = {
      crimeReports: {
        ...currentSettings.preferences.crimeReports,
        ...(preferences.crimeReports ?? {}),
      },
      emergency: {
        ...currentSettings.preferences.emergency,
        ...(preferences.emergency ?? {}),
      },
      general: {
        ...currentSettings.preferences.general,
        ...(preferences.general ?? {}),
      },
      delivery: {
        ...currentSettings.preferences.delivery,
        ...(preferences.delivery ?? {}),
        quietHours: {
          ...currentSettings.preferences.delivery.quietHours,
          ...(preferences.delivery?.quietHours ?? {}),
        },
      },
    };

    const updatedSettings: NotificationSettings = {
      ...currentSettings,
      preferences: mergedPreferences,
      lastUpdated: new Date().toISOString(),
    };

    const settingsRef = ref(database, `notificationSettings/${userId}`);
    await set(settingsRef, updatedSettings);
    return updatedSettings;
  }

  /**
   * Get user's language preference from their account
   */
  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const userRef = ref(database, `civilian/civilian account/${userId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        return userData.language || 'en'; // Default to English if no language preference
      }
      
      return 'en'; // Default to English
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en'; // Default to English on error
    }
  }

  /**
   * Send notification to user (always sent - no user preferences)
   */
  async sendNotification(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      console.log('NotificationService: Sending notification:', type, 'to user:', userId);

      const notification: NotificationPayload = {
        type,
        title,
        body,
        data,
        userId, // This should be the recipient's ID (who will see the notification)
        timestamp: new Date().toISOString(),
      };


      // Store notification in Realtime Database for app display
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      await push(notificationsRef, notification);

      // ALSO create a Firestore document to trigger FCM push notification
      const firestoreNotification = {
        toUserId: userId,
        type: type,
        title: title,
        body: body,
        data: data || {},
        timestamp: new Date().toISOString(),
        read: false,
        // Add any additional fields needed for FCM
        ...(data && Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {} as Record<string, string>))
      };

      // Add document to Firestore notifications collection to trigger Cloud Function
      const notificationsCollection = collection(db, 'notifications');
      await addDoc(notificationsCollection, firestoreNotification);
      
      console.log('NotificationService: ✅ Firestore document created, FCM trigger activated');
      console.log('NotificationService: ✅ Notification sent successfully');
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Get SOS alerts for a user
   */
  async getSOSAlerts(userId: string): Promise<NotificationPayload[]> {
    try {
      console.log('NotificationService: Getting SOS alerts for user:', userId);
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      if (snapshot.exists()) {
        const notifications: NotificationPayload[] = [];
        snapshot.forEach((childSnapshot) => {
          const notification = childSnapshot.val();
          console.log('NotificationService: Found notification:', notification.type, 'fromUserId:', notification.data?.fromUserId);
          if (notification.type === 'sos_alert') {
            notifications.push({
              id: childSnapshot.key || '',
              ...notification
            });
          }
        });
        
        console.log('NotificationService: Total SOS alerts found:', notifications.length);
        console.log('NotificationService: Sent alerts:', notifications.filter(n => n.data?.fromUserId === userId).length);
        console.log('NotificationService: Received alerts:', notifications.filter(n => n.data?.fromUserId !== userId).length);
        
        // Sort by timestamp (newest first)
        return notifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      
      console.log('NotificationService: No notifications found for user:', userId);
      return [];
    } catch (error) {
      console.error('Error getting SOS alerts:', error);
      return [];
    }
  }


  /**
   * Get user's notification history
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<NotificationPayload[]> {
    try {
      console.log('NotificationService: Getting notifications for user:', userId);
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        console.log('NotificationService: Raw notifications data:', notifications);
        const notificationList = Object.entries(notifications).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        console.log('NotificationService: Processed notifications:', notificationList.length);
        return notificationList
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit) as NotificationPayload[];
      }
      console.log('NotificationService: No notifications found for user:', userId);
      return [];
    } catch (error) {
      console.error('NotificationService: Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notificationRef = ref(database, `civilian/civilian account/${userId}/notifications/${notificationId}`);
      await update(notificationRef, { 
        'data/read': true,
        'data/readAt': new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark notification as unread
   */
  async markNotificationAsUnread(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notificationRef = ref(database, `civilian/civilian account/${userId}/notifications/${notificationId}`);
      await update(notificationRef, { 
        'data/read': false,
        'data/readAt': null
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      return false;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notificationRef = ref(database, `civilian/civilian account/${userId}/notifications/${notificationId}`);
      await set(notificationRef, null);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Clear all notifications (excluding SOS alerts)
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        const deletePromises = [];
        
        // Delete all notifications except SOS alerts
        for (const [notificationId, notification] of Object.entries(notifications)) {
          if ((notification as any).type !== 'sos_alert') {
            const notificationRef = ref(database, `civilian/civilian account/${userId}/notifications/${notificationId}`);
            deletePromises.push(set(notificationRef, null));
          }
        }
        
        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} notifications (SOS alerts preserved)`);
        return true;
      }
      
      return true; // No notifications to delete
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return false;
    }
  }


  /**
   * Send notification when a crime report status is updated
   */
  async sendReportStatusUpdateNotification(reportId: string, reporterUid: string, oldStatus: string, newStatus: string, reportTitle?: string): Promise<boolean> {
    try {
      console.log('NotificationService: Sending report status update:', oldStatus, '->', newStatus);

      // Get user's language preference
      const userLanguage = await this.getUserLanguage(reporterUid);

      // Determine notification type and content based on status change
      let notificationType: NotificationType;
      let title: string;
      let body: string;

      if (newStatus.toLowerCase() === 'resolved') {
        // Report resolved notification
        notificationType = 'crime_report_solved';
        title = getTranslation('notifications.reportResolved', userLanguage);
        body = reportTitle 
          ? getTranslation('notifications.reportResolvedBody', userLanguage).replace('{title}', reportTitle)
          : getTranslation('notifications.reportResolvedBodyGeneric', userLanguage);
      } else if (newStatus.toLowerCase() === 'received' || newStatus.toLowerCase() === 'in progress') {
        // Report updated notification (only for received/in progress)
        notificationType = 'crime_report_updated';
        title = getTranslation('notifications.reportStatusUpdated', userLanguage);
        body = reportTitle 
          ? getTranslation('notifications.reportStatusUpdatedBody', userLanguage)
              .replace('{title}', reportTitle)
              .replace('{status}', newStatus)
          : getTranslation('notifications.reportStatusUpdatedBodyGeneric', userLanguage)
              .replace('{status}', newStatus);
      } else {
        // For other status changes, use generic updated notification
        notificationType = 'crime_report_updated';
        title = getTranslation('notifications.reportStatusUpdated', userLanguage);
        body = reportTitle 
          ? getTranslation('notifications.reportStatusChangedBody', userLanguage)
              .replace('{title}', reportTitle)
              .replace('{oldStatus}', oldStatus)
              .replace('{newStatus}', newStatus)
          : getTranslation('notifications.reportStatusChangedBodyGeneric', userLanguage)
              .replace('{oldStatus}', oldStatus)
              .replace('{newStatus}', newStatus);
      }


      const success = await this.sendNotification(
        reporterUid,
        notificationType,
        title,
        body,
        {
          reportId,
          oldStatus,
          newStatus,
          reportTitle,
          type: 'status_update'
        }
      );

      console.log('NotificationService: Report status update notification sent:', success);
      return success;
    } catch (error) {
      console.error('NotificationService: Error sending report status update notification:', error);
      return false;
    }
  }


  /**
   * Create a test notification for debugging
   */
  async createTestNotification(userId: string): Promise<boolean> {
    try {
      // Use the proper sendNotification method to ensure FCM is triggered
      const success = await this.sendNotification(
        userId,
        'crime_report_submitted',
        'Test Notification',
        'This is a test notification to verify the notification system is working.',
        { test: true }
      );
      
      console.log('Test notification created successfully:', success);
      return success;
    } catch (error) {
      console.error('Error creating test notification:', error);
      return false;
    }
  }

  /**
   * Create a test FCM push notification for debugging
   */
  async createTestFCMNotification(userId: string): Promise<boolean> {
    try {
      console.log('NotificationService: 🧪 Creating test FCM notification for user:', userId);
      
      const success = await this.sendNotification(
        userId,
        'crime_report_submitted',
        '🧪 FCM Test Notification',
        'This is a test to verify FCM push notifications are working. You should see this in your system tray.',
        { 
          test: true,
          timestamp: new Date().toISOString(),
          fcmTest: true
        }
      );
      
      console.log('NotificationService: 🧪 Test FCM notification sent:', success);
      return success;
    } catch (error) {
      console.error('Error creating test FCM notification:', error);
      return false;
    }
  }

  /**
   * Create a test resolved notification for debugging
   */
  async createTestResolvedNotification(userId: string): Promise<boolean> {
    try {
      console.log('NotificationService: Creating test resolved notification for user:', userId);
      
      const success = await this.sendNotification(
        userId,
        'crime_report_solved',
        'Test Report Resolved',
        'This is a test notification for a resolved report.',
        {
          reportId: 'test-report-123',
          oldStatus: 'in progress',
          newStatus: 'resolved',
          reportTitle: 'Test Crime Report',
          type: 'status_update'
        }
      );
      
      console.log('NotificationService: Test resolved notification sent:', success);
      return success;
    } catch (error) {
      console.error('Error creating test resolved notification:', error);
      return false;
    }
  }

  /**
   * Listen to real-time notifications for a user
   */
  listenToNotifications(userId: string, callback: (notifications: NotificationPayload[]) => void): () => void {
    try {
      console.log('NotificationService: Setting up real-time listener for user:', userId);
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      
      const unsubscribe = onValue(notificationsRef, (snapshot) => {
        if (snapshot.exists()) {
          const notifications = snapshot.val();
          console.log('NotificationService: Real-time data received:', notifications);
          const notificationList = Object.entries(notifications).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          const sortedNotifications = notificationList
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50) as NotificationPayload[];
          
          console.log('NotificationService: Processed real-time notifications:', sortedNotifications.length);
          callback(sortedNotifications);
        } else {
          console.log('NotificationService: No notifications found in real-time listener');
          callback([]);
        }
      }, (error) => {
        console.error('NotificationService: Real-time listener error:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('NotificationService: Error setting up real-time listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}

export const notificationService = NotificationService.getInstance();
