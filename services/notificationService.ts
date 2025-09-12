import { database } from '../firebaseConfig';
import { ref, set, get, update, push, onValue, off } from 'firebase/database';
import { 
  NotificationSettings, 
  NotificationPreferences, 
  defaultNotificationPreferences,
  NotificationPayload,
  NotificationType 
} from './types/notification-types';

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
      const settingsRef = ref(database, `notificationSettings/${userId}`);
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
      const settingsRef = ref(database, `notificationSettings/${userId}`);
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
   * Send notification to user (if they have it enabled)
   */
  async sendNotification(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      console.log('NotificationService: Sending notification to user:', userId);
      console.log('NotificationService: Type:', type, 'Title:', title);
      
      const settings = await this.getUserNotificationSettings(userId);
      console.log('NotificationService: User settings:', settings);
      
      // For SOS alerts, always send regardless of settings
      if (type === 'sos_alert') {
        console.log('NotificationService: SOS alert - bypassing notification settings');
      } else if (!settings || !this.isNotificationEnabled(settings, type)) {
        console.log('NotificationService: Notification not enabled for user or type');
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

      // Store notification in database
      const notificationsRef = ref(database, `notifications/${userId}`);
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
      const notificationsRef = ref(database, `notifications/${userId}`);
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
    
    if (!preferences.delivery.pushNotifications) return false;

    switch (type) {
      case 'crime_report_new':
        return preferences.crimeReports.enabled && preferences.crimeReports.newReports;
      case 'crime_report_solved':
      case 'crime_report_updated':
        return preferences.crimeReports.enabled && preferences.crimeReports.reportSolved;
      case 'sos_alert':
        return preferences.emergency.enabled && preferences.emergency.sosAlerts;
      case 'emergency_update':
        return preferences.emergency.enabled && preferences.emergency.emergencyUpdates;
      case 'app_update':
        return preferences.general.enabled && preferences.general.appUpdates;
      case 'security_alert':
        return preferences.general.enabled && preferences.general.securityAlerts;
      case 'community_update':
        return preferences.general.enabled && preferences.general.communityUpdates;
      default:
        return false;
    }
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
      const notificationsRef = ref(database, `notifications/${userId}`);
      const snapshot = await get(notificationsRef);
      
      if (snapshot.exists()) {
        const notifications = snapshot.val();
        return Object.values(notifications)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit) as NotificationPayload[];
      }
      return [];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notificationRef = ref(database, `notifications/${userId}/${notificationId}`);
      await update(notificationRef, { read: true, readAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Clear all notifications for user
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const notificationsRef = ref(database, `notifications/${userId}`);
      await set(notificationsRef, null);
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
