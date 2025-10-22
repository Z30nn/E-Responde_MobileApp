import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification channels for Android
const CHANNELS = {
  SOS_ALERTS: 'sos-alerts',
  CRIME_REPORTS: 'crime-reports',
  GENERAL: 'general',
} as const;

// Notification types
export type NotificationType = 'sos' | 'crime_report' | 'general';

export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  vibrate?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: Notifications.NotificationTriggerInput;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   * This should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('NotificationService: Already initialized');
      return;
    }

    try {
      console.log('NotificationService: Initializing...');
      
      // Register for push notifications
      await this.registerForPushNotificationsAsync();
      
      // Set up notification channels for Android
      await this.setupAndroidChannels();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('NotificationService: Initialized successfully');
    } catch (error) {
      console.error('NotificationService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register for push notifications and get the token
   */
  private async registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('NotificationService: Permission not granted for push notifications');
        return null;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('NotificationService: Push token:', token);
      } catch (error) {
        console.error('NotificationService: Error getting push token:', error);
      }
    } else {
      console.warn('NotificationService: Must use physical device for push notifications');
    }

    return token;
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // SOS Alerts Channel (High Priority)
      await Notifications.setNotificationChannelAsync(CHANNELS.SOS_ALERTS, {
        name: 'SOS Alerts',
        description: 'Emergency SOS notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Crime Reports Channel (Normal Priority)
      await Notifications.setNotificationChannelAsync(CHANNELS.CRIME_REPORTS, {
        name: 'Crime Reports',
        description: 'Crime report notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2d3480',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // General Channel (Normal Priority)
      await Notifications.setNotificationChannelAsync(CHANNELS.GENERAL, {
        name: 'General',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2d3480',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      console.log('NotificationService: Android channels configured');
    } catch (error) {
      console.error('NotificationService: Error setting up Android channels:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('NotificationService: Notification received:', notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('NotificationService: Notification response:', response);
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data?.type === 'sos') {
        console.log('NotificationService: SOS notification tapped');
        // Navigate to SOS tab or handle SOS notification tap
      } else if (data?.type === 'crime_report') {
        console.log('NotificationService: Crime report notification tapped');
        // Navigate to reports tab or handle crime report notification tap
      }
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      const granted = status === 'granted';
      console.log('NotificationService: Permissions granted:', granted);
      return granted;
    } catch (error) {
      console.error('NotificationService: Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('NotificationService: Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Send an immediate local notification
   */
  async sendLocal(notificationData: NotificationData): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        console.warn('NotificationService: Not initialized, initializing now...');
        await this.initialize();
      }

      const channelId = this.getChannelId(notificationData.type);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          vibrate: notificationData.vibrate !== false,
          priority: notificationData.priority || 'high',
          badge: 1,
        },
        trigger: null, // Send immediately
        ...(Platform.OS === 'android' && { channelId }),
      });

      console.log('NotificationService: Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('NotificationService: Error sending local notification:', error);
      return null;
    }
  }

  /**
   * Schedule a local notification with delay
   */
  async scheduleLocal(
    notificationData: NotificationData,
    delayMs: number
  ): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        console.warn('NotificationService: Not initialized, initializing now...');
        await this.initialize();
      }

      const channelId = this.getChannelId(notificationData.type);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          vibrate: notificationData.vibrate !== false,
          priority: notificationData.priority || 'normal',
          badge: 1,
        },
        trigger: { seconds: delayMs / 1000 },
        ...(Platform.OS === 'android' && { channelId }),
      });

      console.log('NotificationService: Scheduled notification:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('NotificationService: Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('NotificationService: Cancelled notification:', notificationId);
    } catch (error) {
      console.error('NotificationService: Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('NotificationService: Cancelled all notifications');
    } catch (error) {
      console.error('NotificationService: Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('NotificationService: Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('NotificationService: Badge cleared');
    } catch (error) {
      console.error('NotificationService: Error clearing badge:', error);
    }
  }

  /**
   * Get the appropriate Android channel ID for notification type
   */
  private getChannelId(type: NotificationType): string {
    switch (type) {
      case 'sos':
        return CHANNELS.SOS_ALERTS;
      case 'crime_report':
        return CHANNELS.CRIME_REPORTS;
      default:
        return CHANNELS.GENERAL;
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    console.log('NotificationService: Cleaned up listeners');
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// React Hook for using notifications
export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeNotifications();
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      await notificationService.initialize();
      const hasPermissions = await notificationService.areNotificationsEnabled();
      setHasPermission(hasPermissions);
      setIsInitialized(true);
    } catch (error) {
      console.error('useNotifications: Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const granted = await notificationService.requestPermissions();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('useNotifications: Permission request error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendLocal = async (notificationData: NotificationData): Promise<string | null> => {
    if (!hasPermission) {
      console.warn('useNotifications: No permission to send notifications');
      return null;
    }
    return await notificationService.sendLocal(notificationData);
  };

  const scheduleLocal = async (
    notificationData: NotificationData,
    delayMs: number
  ): Promise<string | null> => {
    if (!hasPermission) {
      console.warn('useNotifications: No permission to schedule notifications');
      return null;
    }
    return await notificationService.scheduleLocal(notificationData, delayMs);
  };

  const cancelNotification = async (notificationId: string): Promise<void> => {
    await notificationService.cancelNotification(notificationId);
  };

  const cancelAllNotifications = async (): Promise<void> => {
    await notificationService.cancelAllNotifications();
  };

  const clearBadge = async (): Promise<void> => {
    await notificationService.clearBadge();
  };

  return {
    isInitialized,
    hasPermission,
    isLoading,
    requestPermissions,
    sendLocal,
    scheduleLocal,
    cancelNotification,
    cancelAllNotifications,
    clearBadge,
  };
};

// Predefined notification templates
export const NotificationTemplates = {
  SOS_SENT: {
    type: 'sos' as NotificationType,
    title: '🚨 SOS Sent',
    body: 'Your emergency alert has been dispatched to your contacts and police.',
    data: { type: 'sos', timestamp: Date.now() },
    sound: true,
    vibrate: true,
    priority: 'high' as const,
  },
  
  CRIME_REPORT_SUBMITTED: {
    type: 'crime_report' as NotificationType,
    title: '✅ Report Submitted',
    body: 'Police have received your crime report and will review it shortly.',
    data: { type: 'crime_report', timestamp: Date.now() },
    sound: true,
    vibrate: true,
    priority: 'normal' as const,
  },
  
  REPORT_STATUS_UPDATED: {
    type: 'crime_report' as NotificationType,
    title: '📋 Report Status Updated',
    body: 'Your crime report status has been updated.',
    data: { type: 'crime_report', timestamp: Date.now() },
    sound: true,
    vibrate: true,
    priority: 'normal' as const,
  },
  
  EMERGENCY_CONTACT_ADDED: {
    type: 'general' as NotificationType,
    title: '👥 Emergency Contact Added',
    body: 'New emergency contact has been added to your list.',
    data: { type: 'emergency_contact', timestamp: Date.now() },
    sound: false,
    vibrate: false,
    priority: 'normal' as const,
  },
};

export default notificationService;
