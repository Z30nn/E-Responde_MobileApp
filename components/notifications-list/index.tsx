import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Image,
} from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useNotification } from '../../services/notificationContext';
import { NotificationPayload } from '../../services/types/notification-types';
import { NotificationService } from '../../services/notificationService';
import { createStyles } from './styles';

interface NotificationsListProps {
  userId: string;
  onNavigateToScreen?: (screen: string, params?: any) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ userId, onNavigateToScreen }) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { notifications, isLoading, loadNotifications, markAsRead } = useNotification();
  const [localNotifications, setLocalNotifications] = useState<NotificationPayload[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts);

  useEffect(() => {
    if (userId) {
      console.log('NotificationsList: Loading notifications for userId:', userId);
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  useEffect(() => {
    console.log('NotificationsList: Notifications updated:', notifications?.length || 0);
    if (notifications) {
      setLocalNotifications(notifications);
    }
  }, [notifications]);

  // Update current time every minute to refresh timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = currentTime; // Use currentTime state instead of new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return t('notifications.justNow');
    } else if (diffInMinutes < 60) {
      return t('notifications.minutesAgo').replace('{minutes}', diffInMinutes.toString());
    } else if (diffInHours < 24) {
      return t('notifications.hoursAgo').replace('{hours}', diffInHours.toString());
    } else if (diffInDays < 7) {
      return t('notifications.daysAgo').replace('{days}', diffInDays.toString());
    } else {
      // For older notifications, show the actual date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return '🚨';
      case 'crime_report_submitted':
      case 'crime_report_new':
      case 'crime_report_solved':
      case 'crime_report_updated':
        return '📋';
      case 'emergency_update':
        return '⚠️';
      case 'app_update':
        return '📱';
      case 'security_alert':
        return '🔒';
      case 'community_update':
        return '👥';
      default:
        return '🔔';
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return '#FF4444';
      case 'crime_report_submitted':
      case 'crime_report_new':
      case 'crime_report_solved':
      case 'crime_report_updated':
        return '#E6F3FF';
      case 'emergency_update':
        return '#FFF0E6';
      case 'app_update':
        return '#E6FFE6';
      case 'security_alert':
        return '#FFE6E6';
      case 'community_update':
        return '#F0E6FF';
      default:
        return '#F0F0F0';
    }
  };


  const handleNotificationPress = async (notification: NotificationPayload) => {
    // Mark notification as read first
    if (!notification.data?.read && notification.id) {
      try {
        await markAsRead(notification.id);
        // Update local state to reflect the change
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, data: { ...notif.data, read: true, readAt: new Date().toISOString() } }
              : notif
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle navigation based on notification type
    if (onNavigateToScreen) {
      switch (notification.type) {
        case 'sos_alert':
          // Navigate to SOS alerts or emergency screen
          onNavigateToScreen('SOS', { alertId: notification.id, data: notification.data });
          break;
        case 'crime_report_submitted':
        case 'crime_report_new':
        case 'crime_report_updated':
          // Navigate to crime report detail
          console.log('Crime report notification data:', notification.data);
          console.log('Report ID from notification:', notification.data?.reportId);
          onNavigateToScreen('CrimeReportDetail', { reportId: notification.data?.reportId });
          break;
        case 'crime_report_solved':
          // Navigate to solved crime report
          onNavigateToScreen('CrimeReportDetail', { reportId: notification.data?.reportId, solved: true });
          break;
        case 'emergency_update':
          // Navigate to emergency updates
          onNavigateToScreen('Emergency', { updateId: notification.id });
          break;
        case 'app_update':
          // Navigate to app settings or update screen
          onNavigateToScreen('Settings', { section: 'app-update' });
          break;
        case 'security_alert':
          // Navigate to security settings
          onNavigateToScreen('Settings', { section: 'security' });
          break;
        case 'community_update':
          // Navigate to community updates
          onNavigateToScreen('Community', { updateId: notification.id });
          break;
        default:
          console.log('Unknown notification type:', notification.type);
          break;
      }
    }
  };

  const handleNotificationLongPress = async (notification: NotificationPayload) => {
    console.log('NotificationsList: Long press detected for notification:', notification.type, notification.id);
    
    const options = [];
    
    // Add mark as read/unread option
    if (notification.data?.read) {
      options.push(t('notifications.markAsUnread'));
    } else {
      options.push(t('notifications.markAsRead'));
    }
    
    // Only add delete option for non-SOS alerts
    if (notification.type !== 'sos_alert') {
      options.push(t('notifications.delete'));
    }
    
    options.push(t('common.cancel'));
    
    console.log('NotificationsList: Available options:', options);

    const showActionSheet = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: options.length - 1,
            title: t('notifications.notificationOptions'),
          },
          async (buttonIndex) => {
            await handleActionSheetSelection(buttonIndex, notification, options);
          }
        );
      } else {
        // For Android, use Alert
        const alertButtons = [];
        
        // Add mark as read/unread button
        alertButtons.push({
          text: options[0], // Mark as read/unread
          onPress: () => handleActionSheetSelection(0, notification, options),
        });
        
        // Add delete button only for non-SOS alerts
        if (notification.type !== 'sos_alert') {
          alertButtons.push({
            text: 'Delete',
            onPress: () => handleActionSheetSelection(1, notification, options),
            style: 'destructive',
          });
        }
        
        alertButtons.push({
          text: 'Cancel',
          style: 'cancel',
        });
        
        Alert.alert(
          t('notifications.notificationOptions'),
          t('notifications.chooseAction'),
          alertButtons
        );
      }
    };

    showActionSheet();
  };

  const handleActionSheetSelection = async (buttonIndex: number, notification: NotificationPayload, options: string[]) => {
    const selectedOption = options[buttonIndex];
    
    if (selectedOption === t('notifications.markAsRead')) {
      await markNotificationAsRead(notification);
    } else if (selectedOption === t('notifications.markAsUnread')) {
      await markNotificationAsUnread(notification);
    } else if (selectedOption === t('notifications.delete')) {
      await deleteNotification(notification);
    }
  };

  const markNotificationAsRead = async (notification: NotificationPayload) => {
    if (notification.id) {
      try {
        await markAsRead(notification.id);
        // Update local state to reflect the change
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, data: { ...notif.data, read: true, readAt: new Date().toISOString() } }
              : notif
          )
        );
        console.log('Notification marked as read');
      } catch (error) {
        console.error('Error marking notification as read:', error);
        Alert.alert('Error', 'Failed to mark notification as read');
      }
    }
  };

  const markNotificationAsUnread = async (notification: NotificationPayload) => {
    if (notification.id) {
      try {
        await NotificationService.getInstance().markNotificationAsUnread(userId, notification.id);
        // Update local state to reflect the change
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, data: { ...notif.data, read: false, readAt: undefined } }
              : notif
          )
        );
        console.log('Notification marked as unread');
      } catch (error) {
        console.error('Error marking notification as unread:', error);
        Alert.alert('Error', 'Failed to mark notification as unread');
      }
    }
  };

  const deleteNotification = async (notification: NotificationPayload) => {
    if (notification.id) {
      try {
        await NotificationService.getInstance().deleteNotification(userId, notification.id);
        // Remove from local state
        setLocalNotifications(prev => 
          prev.filter(notif => notif.id !== notification.id)
        );
        console.log('Notification deleted');
      } catch (error) {
        console.error('Error deleting notification:', error);
        Alert.alert('Error', 'Failed to delete notification');
      }
    }
  };

  const handleAcceptContactRequest = async (notification: NotificationPayload) => {
    try {
      console.log('Accepting primary contact request:', notification.data);
      
      if (!notification.data?.requesterUserId || !notification.data?.contactId) {
        console.error('Missing required data:', { 
          requesterUserId: notification.data?.requesterUserId, 
          contactId: notification.data?.contactId,
          userId 
        });
        Alert.alert('Error', 'Invalid contact request data');
        return;
      }
      
      if (!userId) {
        console.error('User ID not available');
        Alert.alert('Error', 'User authentication required');
        return;
      }
      
      // Import the emergency contacts service
      const { EmergencyContactsService } = require('../../services/emergencyContactsService');
      
      console.log('Calling acceptPrimaryContactRequest with:', {
        requesterUserId: notification.data.requesterUserId,
        contactId: notification.data.contactId,
        accepterUserId: userId
      });
      
      // Accept the primary contact request
      const success = await EmergencyContactsService.acceptPrimaryContactRequest(
        notification.data.requesterUserId,
        notification.data.contactId,
        userId
      );
      
      console.log('Accept result:', success);
      
      if (success) {
        // Mark notification as read
        if (notification.id) {
          await markAsRead(notification.id);
        }
        
        // Update local state to remove action buttons
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, data: { ...notif.data, read: true, readAt: new Date().toISOString() } }
              : notif
          )
        );
        
        Alert.alert(t('notifications.requestAccepted'), t('notifications.requestAcceptedDesc'));
      } else {
        Alert.alert('Error', 'Failed to accept contact request. Please try again.');
      }
      
    } catch (error) {
      console.error('Error accepting contact request:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      Alert.alert('Error', `Failed to accept contact request: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeclineContactRequest = async (notification: NotificationPayload) => {
    try {
      console.log('Declining primary contact request:', notification.data);
      
      if (!notification.data?.requesterUserId || !notification.data?.contactId) {
        Alert.alert('Error', 'Invalid contact request data');
        return;
      }
      
      // Import the emergency contacts service
      const { EmergencyContactsService } = require('../../services/emergencyContactsService');
      
      // Decline the primary contact request
      const success = await EmergencyContactsService.declinePrimaryContactRequest(
        notification.data.requesterUserId,
        notification.data.contactId,
        userId
      );
      
      if (success) {
        // Mark notification as read
        if (notification.id) {
          await markAsRead(notification.id);
        }
        
        // Update local state to remove action buttons
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id 
              ? { ...notif, data: { ...notif.data, read: true, readAt: new Date().toISOString() } }
              : notif
          )
        );
        
        Alert.alert(t('notifications.requestDeclined'), t('notifications.requestDeclinedDesc'));
      } else {
        Alert.alert('Error', 'Failed to decline contact request');
      }
      
    } catch (error) {
      console.error('Error declining contact request:', error);
      Alert.alert('Error', 'Failed to decline contact request');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: theme.primary + '15',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
        <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
      </View>
    );
  }

  if (!localNotifications || localNotifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Image 
          source={require('../../assets/empty.png')} 
          style={{
            width: 180,
            height: 180,
            marginBottom: 24,
          }}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>{t('notifications.empty')}</Text>
      </View>
    );
  }

  return (
    <>
      
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {localNotifications.map((notification, index) => (
           <TouchableOpacity
             key={`${notification.timestamp}-${index}`}
             style={[
               styles.notificationItem,
               notification.type === 'sos_alert' && styles.sosNotificationItem
             ]}
             onPress={() => handleNotificationPress(notification)}
             onLongPress={() => {
               console.log('NotificationsList: TouchableOpacity onLongPress triggered');
               handleNotificationLongPress(notification);
             }}
             delayLongPress={500}
             activeOpacity={0.7}
           >
            <View style={styles.notificationHeader}>
              <View style={[
                styles.notificationIconContainer,
                { backgroundColor: getNotificationIconColor(notification.type) },
                notification.type === 'sos_alert' && styles.sosIconContainer
              ]}>
                <Text style={[
                  styles.notificationIcon,
                  notification.type === 'sos_alert' && styles.sosIcon
                ]}>
                  {getNotificationIcon(notification.type)}
                </Text>
                {!notification.data?.read && (
                  <View style={[
                    styles.notificationBadge,
                    notification.type === 'sos_alert' && styles.sosBadge
                  ]} />
                )}
              </View>
              <View style={styles.notificationContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={[
                    styles.notificationTitle,
                    notification.type === 'sos_alert' && styles.sosTitle
                  ]} numberOfLines={2}>
                    {notification.title}
                  </Text>
                  <Text style={[
                    styles.notificationTime,
                    notification.type === 'sos_alert' && styles.sosTime
                  ]}>
                    {formatTimestamp(notification.timestamp)}
                  </Text>
                </View>
                <Text style={[
                  styles.notificationBody,
                  notification.type === 'sos_alert' && styles.sosBody
                ]} numberOfLines={3}>
                  {notification.body}
                </Text>
                
                <Text style={[styles.longPressHint, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                  {t('notifications.longPressHint')}
                </Text>
                
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
};

export default NotificationsList;
