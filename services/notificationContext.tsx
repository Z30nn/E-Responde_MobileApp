import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './authContext';
import { NotificationService } from './notificationService';
import { soundService } from './soundService';
import { 
  NotificationSettings, 
  NotificationPreferences, 
  defaultNotificationPreferences,
  NotificationPayload 
} from './types/notification-types';

interface NotificationContextType {
  settings: NotificationSettings | null;
  isLoading: boolean;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>;
  sendNotification: (type: string, title: string, body: string, data?: Record<string, any>) => Promise<boolean>;
  notifications: NotificationPayload[];
  markAsRead: (notificationId: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  getSOSAlerts: () => Promise<NotificationPayload[]>;
  loadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotificationSettings();
      loadNotifications();
      // Set up real-time listener for notifications
      const unsubscribe = NotificationService.getInstance().listenToNotifications(user.uid, (notifications) => {
        console.log('NotificationContext: Real-time update received:', notifications.length);
        setNotifications(notifications);
      });
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      setSettings(null);
      setNotifications([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadNotificationSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userSettings = await NotificationService.getInstance().getUserNotificationSettings(user.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      console.log('NotificationContext: No user, skipping notification load');
      return;
    }
    
    try {
      console.log('NotificationContext: Loading notifications for user:', user.uid);
      const userNotifications = await NotificationService.getInstance().getUserNotifications(user.uid);
      console.log('NotificationContext: Loaded notifications:', userNotifications.length);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('NotificationContext: Error loading notifications:', error);
    }
  }, [user]);

  const updatePreferences = async (preferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!user || !settings) return false;
    
    try {
      const success = await NotificationService.getInstance().updateNotificationPreferences(user.uid, preferences);
      if (success) {
        await loadNotificationSettings(); // Refresh settings
      }
      return success;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  const sendNotification = async (type: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await NotificationService.getInstance().sendNotification(user.uid, type as any, title, body, data);
      
      // Play sound for SOS alerts
      if (type === 'sos' || title.toLowerCase().includes('sos') || body.toLowerCase().includes('emergency')) {
        await soundService.playSOSSound();
      }
      
      return success;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const markAsRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await NotificationService.getInstance().markNotificationAsRead(user.uid, notificationId);
      if (success) {
        await loadNotifications(); // Refresh notifications
      }
      return success;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  const getSOSAlerts = async (): Promise<NotificationPayload[]> => {
    if (!user) return [];
    
    try {
      return await NotificationService.getInstance().getSOSAlerts(user.uid);
    } catch (error) {
      console.error('Error getting SOS alerts:', error);
      return [];
    }
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await NotificationService.getInstance().clearAllNotifications(user.uid);
      if (success) {
        setNotifications([]);
      }
      return success;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  };

  const refreshSettings = useCallback(async (): Promise<void> => {
    await loadNotificationSettings();
    await loadNotifications();
  }, [loadNotificationSettings, loadNotifications]);

  const value: NotificationContextType = {
    settings,
    isLoading,
    updatePreferences,
    sendNotification,
    notifications,
    markAsRead,
    clearAllNotifications,
    refreshSettings,
    getSOSAlerts,
    loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
