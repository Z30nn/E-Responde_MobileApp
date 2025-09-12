import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './authContext';
import { notificationService } from './notificationService';
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
    } else {
      setSettings(null);
      setNotifications([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadNotificationSettings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userSettings = await notificationService.getUserNotificationSettings(user.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const userNotifications = await notificationService.getUserNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const updatePreferences = async (preferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!user || !settings) return false;
    
    try {
      const success = await notificationService.updateNotificationPreferences(user.uid, preferences);
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
      return await notificationService.sendNotification(user.uid, type as any, title, body, data);
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const markAsRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await notificationService.markNotificationAsRead(user.uid, notificationId);
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
      return await notificationService.getSOSAlerts(user.uid);
    } catch (error) {
      console.error('Error getting SOS alerts:', error);
      return [];
    }
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await notificationService.clearAllNotifications(user.uid);
      if (success) {
        setNotifications([]);
      }
      return success;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  };

  const refreshSettings = async (): Promise<void> => {
    await loadNotificationSettings();
    await loadNotifications();
  };

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
