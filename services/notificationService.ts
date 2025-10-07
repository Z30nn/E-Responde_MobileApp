import { database } from '../firebaseConfig';
import { ref, set, get, update, push, onValue, off } from 'firebase/database';
import { 
  NotificationSettings, 
  NotificationPreferences, 
  defaultNotificationPreferences,
  NotificationPayload,
  NotificationType 
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

  /**
   * Get user's notification preferences
   */
  async getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      // Debug: Check authentication status
      const { auth } = await import('../firebaseConfig');
      console.log('NotificationService: Current auth user:', auth.currentUser?.uid);
      console.log('NotificationService: Requested userId:', userId);
      console.log('NotificationService: Auth match:', auth.currentUser?.uid === userId);
      
      // Try using the same structure as other user data
      const settingsRef = ref(database, `civilian/civilian account/${userId}/notificationSettings`);
      const snapshot = await get(settingsRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as NotificationSettings;
      } else {
        // Create default settings for new user
        const defaultSettings: NotificationSettings = {
          userId,
          preferences: defaultNotificationPreferences,
          lastUpdated: new Date().toISOString(),
        };
        await this.updateUserNotificationSettings(userId, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserNotificationSettings(userId: string, settings: NotificationSettings): Promise<boolean> {
    try {
      const settingsRef = ref(database, `civilian/civilian account/${userId}/notificationSettings`);
      const updatedSettings = {
        ...settings,
        lastUpdated: new Date().toISOString(),
      };
      await set(settingsRef, updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  /**
   * Update specific notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const currentSettings = await this.getUserNotificationSettings(userId);
      if (!currentSettings) return false;

      const updatedSettings: NotificationSettings = {
        ...currentSettings,
        preferences: {
          ...currentSettings.preferences,
          ...preferences,
        },
        lastUpdated: new Date().toISOString(),
      };

      return await this.updateUserNotificationSettings(userId, updatedSettings);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
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
   * Send notification to user (if they have it enabled)
   */
  async sendNotification(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      console.log('NotificationService: ===== SENDING NOTIFICATION =====');
      console.log('NotificationService: User ID:', userId);
      console.log('NotificationService: Type:', type);
      console.log('NotificationService: Title:', title);
      console.log('NotificationService: Body:', body);
      console.log('NotificationService: Data:', data);
      
      const settings = await this.getUserNotificationSettings(userId);
      console.log('NotificationService: User settings loaded:', !!settings);
      console.log('NotificationService: Settings details:', settings);
      
      // For SOS alerts, always send regardless of settings
      if (type === 'sos_alert') {
        console.log('NotificationService: SOS alert - bypassing notification settings');
      } else if (!settings || !this.isNotificationEnabled(settings, type)) {
        console.log('NotificationService: Notification not enabled for user or type:', type);
        console.log('NotificationService: Settings check result:', !settings ? 'No settings' : 'Settings exist');
        if (settings) {
          console.log('NotificationService: isNotificationEnabled result:', this.isNotificationEnabled(settings, type));
        }
        return false;
      }

      // Check quiet hours (skip for SOS alerts)
      if (type !== 'sos_alert' && settings && settings.preferences.delivery.quietHours.enabled && this.isQuietHours(settings.preferences.delivery.quietHours)) {
        console.log('NotificationService: In quiet hours, not sending notification');
        return false;
      }

      const notification: NotificationPayload = {
        type,
        title,
        body,
        data,
        userId, // This should be the recipient's ID (who will see the notification)
        timestamp: new Date().toISOString(),
      };

      console.log('NotificationService: Notification payload:', notification);
      console.log('NotificationService: Data in notification:', data);
      if (data && data.location) {
        console.log('NotificationService: Location in data:', data.location);
      }

      // Store notification in database
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      await push(notificationsRef, notification);

      // Here you would integrate with actual push notification service
      // For now, we'll just log it
      console.log('NotificationService: Notification sent successfully:', notification);
      
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
   * Check if a specific notification type is enabled for user
   */
  private isNotificationEnabled(settings: NotificationSettings, type: NotificationType): boolean {
    const { preferences } = settings;
    
    console.log('NotificationService: ===== CHECKING NOTIFICATION ENABLED =====');
    console.log('NotificationService: Type:', type);
    console.log('NotificationService: Preferences:', preferences);
    console.log('NotificationService: Push notifications enabled:', preferences.delivery.pushNotifications);
    console.log('NotificationService: Crime reports enabled:', preferences.crimeReports.enabled);
    console.log('NotificationService: Report solved enabled:', preferences.crimeReports.reportSolved);
    
    if (!preferences.delivery.pushNotifications) {
      console.log('NotificationService: Push notifications disabled - BLOCKING NOTIFICATION');
      return false;
    }

    let result = false;
    
    switch (type) {
      case 'crime_report_submitted':
        result = preferences.crimeReports.enabled && preferences.crimeReports.reportSubmitted;
        break;
      case 'crime_report_new':
        result = preferences.crimeReports.enabled && preferences.crimeReports.newReports;
        break;
      case 'crime_report_solved':
        result = preferences.crimeReports.enabled && preferences.crimeReports.reportSolved;
        break;
      case 'crime_report_updated':
        result = preferences.crimeReports.enabled && preferences.crimeReports.reportUpdated;
        break;
      case 'sos_alert':
        result = preferences.emergency.enabled && preferences.emergency.sosAlerts;
        break;
      case 'emergency_update':
        result = preferences.emergency.enabled && preferences.emergency.emergencyUpdates;
        break;
      case 'app_update':
        result = preferences.general.enabled && preferences.general.appUpdates;
        break;
      case 'security_alert':
        result = preferences.general.enabled && preferences.general.securityAlerts;
        break;
      case 'community_update':
        result = preferences.general.enabled && preferences.general.communityUpdates;
        break;
      default:
        result = false;
    }
    
    console.log('NotificationService: Final result for type', type, ':', result);
    console.log('NotificationService: ===========================================');
    return result;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: { enabled: boolean; startTime: string; endTime: string }): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
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
   * Delete notification
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
   * Clear all notifications for user
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      await set(notificationsRef, null);
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  }

  /**
   * Send notification when a crime report status is updated
   */
  async sendReportStatusUpdateNotification(reportId: string, reporterUid: string, oldStatus: string, newStatus: string, reportTitle?: string): Promise<boolean> {
    try {
      console.log('NotificationService: ===== SENDING REPORT STATUS UPDATE NOTIFICATION =====');
      console.log('NotificationService: Report ID:', reportId);
      console.log('NotificationService: Reporter UID:', reporterUid);
      console.log('NotificationService: Status change:', oldStatus, '->', newStatus);
      console.log('NotificationService: Report title:', reportTitle);
      console.log('NotificationService: Is resolved status?', newStatus.toLowerCase() === 'resolved');

      // Get user's language preference
      const userLanguage = await this.getUserLanguage(reporterUid);
      console.log('NotificationService: User language:', userLanguage);

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

      console.log('NotificationService: Using notification type:', notificationType);
      console.log('NotificationService: Title:', title);
      console.log('NotificationService: Body:', body);

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

      console.log('NotificationService: ===== NOTIFICATION SEND RESULT =====');
      console.log('NotificationService: Report status update notification sent:', success);
      console.log('NotificationService: ===========================================');
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
      const testNotification: NotificationPayload = {
        type: 'app_update',
        title: 'Test Notification',
        body: 'This is a test notification to verify the notification system is working.',
        data: { test: true },
        userId,
        timestamp: new Date().toISOString(),
      };

      const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
      await push(notificationsRef, testNotification);
      console.log('Test notification created successfully');
      return true;
    } catch (error) {
      console.error('Error creating test notification:', error);
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
