export interface NotificationsListProps {
  userId: string;
}

export interface NotificationItemProps {
  notification: {
    type: string;
    title: string;
    body: string;
    timestamp: string;
    data?: Record<string, any>;
  };
  onPress: (notification: any) => void;
  onMarkAsRead: (notificationId: string) => void;
}
