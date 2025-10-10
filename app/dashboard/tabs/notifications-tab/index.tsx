import React, { FC } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import { useNotification } from '../../../../services/notificationContext';
import NotificationsList from '../../../../components/notifications-list';
import { createStyles } from './styles';

interface NotificationsTabProps {
  userId: string | null;
  showNotificationMenu: boolean;
  onToggleMenu: () => void;
  onNavigateToScreen: (screen: string, params?: any) => void;
}

const NotificationsTab: FC<NotificationsTabProps> = ({
  userId,
  showNotificationMenu,
  onToggleMenu,
  onNavigateToScreen,
}) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { notifications, markAsRead } = useNotification();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  const handleMarkAllAsRead = async () => {
    try {
      if (notifications) {
        const unreadNotifications = notifications.filter(notification => !notification.data?.read);

        if (unreadNotifications.length === 0) {
          Alert.alert('Info', 'All notifications are already marked as read');
          onToggleMenu();
          return;
        }

        // Mark all unread notifications as read
        const promises = unreadNotifications.map(notification =>
          notification.id ? markAsRead(notification.id) : Promise.resolve()
        );

        await Promise.all(promises);

        console.log(`Marked ${unreadNotifications.length} notifications as read`);
        Alert.alert('Success', `Marked ${unreadNotifications.length} notifications as read`);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
    onToggleMenu();
  };

  return (
    <View style={styles.notificationsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Notifications</Text>
        <View style={styles.notificationHeaderButtons}>
          <TouchableOpacity
            style={styles.threeDotButton}
            onPress={onToggleMenu}
            activeOpacity={0.7}
          >
            <Text style={styles.threeDotText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Menu */}
      {showNotificationMenu && (
        <View style={styles.notificationMenu}>
          <TouchableOpacity
            style={styles.notificationMenuItem}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationMenuItemText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {userId ? (
        <NotificationsList
          userId={userId}
          onNavigateToScreen={onNavigateToScreen}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

export default NotificationsTab;

