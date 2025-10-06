export interface NotificationPreferences {
  // Crime Report Notifications
  crimeReports: {
    enabled: boolean;
    reportSubmitted: boolean; // Notify when user submits their own report
    newReports: boolean; // Notify when other users publish crime reports
    reportSolved: boolean; // Notify when user's own report is solved
    reportUpdated: boolean; // Notify when user's own report is updated
  };
  
  // Emergency/SOS Notifications
    emergency: {
      enabled: boolean;
      sosAlerts: boolean; // Notify when someone with user as primary contact sends SOS
      emergencyUpdates: boolean; // Notify about emergency updates
    };
  
  // General App Notifications
  general: {
    enabled: boolean;
    appUpdates: boolean; // Notify about app updates
    securityAlerts: boolean; // Notify about security alerts
    communityUpdates: boolean; // Notify about community updates
  };
  
  
  // Notification Delivery Settings
  delivery: {
    pushNotifications: boolean; // Enable/disable all push notifications
    emailNotifications: boolean; // Email notifications
    smsNotifications: boolean; // SMS notifications (if available)
    quietHours: {
      enabled: boolean;
      startTime: string; // Format: "22:00"
      endTime: string; // Format: "08:00"
    };
  };
}

export interface NotificationSettings {
  userId: string;
  preferences: NotificationPreferences;
  lastUpdated: string;
  deviceToken?: string; // For push notifications
}

export const defaultNotificationPreferences: NotificationPreferences = {
  crimeReports: {
    enabled: true,
    reportSubmitted: true,
    newReports: true,
    reportSolved: true,
    reportUpdated: true,
  },
    emergency: {
      enabled: true,
      sosAlerts: true,
      emergencyUpdates: true,
    },
  general: {
    enabled: true,
    appUpdates: true,
    securityAlerts: true,
    communityUpdates: true,
  },
  delivery: {
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    quietHours: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00",
    },
  },
};

export type NotificationType =
  | 'crime_report_submitted'
  | 'crime_report_new'
  | 'crime_report_solved'
  | 'crime_report_updated'
  | 'sos_alert'
  | 'emergency_update'
  | 'app_update'
  | 'security_alert'
  | 'community_update';

export interface NotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  timestamp: string;
}
