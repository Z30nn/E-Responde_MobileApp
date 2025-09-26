import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useNotification } from '../../services/notificationContext';
import { NotificationPreferences } from '../../services/types/notification-types';
import { styles } from './styles';

const NotificationSettings: React.FC = () => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { settings, isLoading, updatePreferences } = useNotification();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalPreferences(settings.preferences);
    }
  }, [settings]);

  const handlePreferenceChange = async (category: keyof NotificationPreferences, field: string, value: boolean) => {
    if (!localPreferences) return;

    const updatedPreferences = {
      ...localPreferences,
      [category]: {
        ...localPreferences[category],
        [field]: value,
      },
    };

    setLocalPreferences(updatedPreferences);

    try {
      const success = await updatePreferences({ [category]: updatedPreferences[category] });
      if (!success) {
        // Revert on failure
        setLocalPreferences(localPreferences);
        Alert.alert(t('common.error'), t('notifications.updateFailed'));
      }
    } catch (error) {
      setLocalPreferences(localPreferences);
      Alert.alert(t('common.error'), t('notifications.updateFailed'));
    }
  };


  const renderSection = (
    title: string,
    category: keyof NotificationPreferences,
    fields: Array<{ key: string; label: string; description?: string }>
  ) => {
    if (!localPreferences) return null;

    return (
      <View style={[styles.section, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F9FA' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
          {title}
        </Text>
        
        {fields.map((field) => (
          <View key={field.key} style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
                {field.label}
              </Text>
              {field.description && (
                <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#666666' }]}>
                  {field.description}
                </Text>
              )}
            </View>
            <Switch
              value={localPreferences[category][field.key as keyof typeof localPreferences[typeof category]] as boolean}
              onValueChange={(value) => handlePreferenceChange(category, field.key, value)}
              trackColor={{ false: '#767577', true: '#1E3A8A' }}
              thumbColor={localPreferences[category][field.key as keyof typeof localPreferences[typeof category]] ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        ))}
      </View>
    );
  };


  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
        <Text style={[styles.loadingText, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  }

  if (!localPreferences) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
        <Text style={[styles.errorText, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
          {t('notifications.loadError')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
          {t('notifications.settings')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#CCCCCC' : '#666666' }]}>
          {t('notifications.customizeDesc')}
        </Text>
      </View>

      {/* Crime Reports Section */}
      {renderSection(
        t('notifications.crimeReports'),
        'crimeReports',
        [
          { key: 'enabled', label: t('notifications.enableCrimeReports'), description: t('notifications.enableCrimeReportsDesc') },
          { key: 'newReports', label: t('notifications.newReports'), description: t('notifications.newReportsDesc') },
          { key: 'reportSolved', label: t('notifications.reportSolved'), description: t('notifications.reportSolvedDesc') },
          { key: 'reportUpdated', label: t('notifications.reportUpdated'), description: t('notifications.reportUpdatedDesc') },
        ]
      )}

      {/* Emergency Section */}
      {renderSection(
        t('notifications.emergency'),
        'emergency',
        [
          { key: 'enabled', label: t('notifications.enableEmergency'), description: t('notifications.enableEmergencyDesc') },
          { key: 'sosAlerts', label: t('notifications.sosAlerts'), description: t('notifications.sosAlertsDesc') },
        ]
      )}


      {/* Delivery Settings Section */}
      <View style={[styles.section, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F9FA' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
          {t('notifications.delivery')}
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
              {t('notifications.emailNotifications')}
            </Text>
            <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#666666' }]}>
              {t('notifications.emailNotificationsDesc')}
            </Text>
          </View>
          <Switch
            value={localPreferences.delivery.emailNotifications}
            onValueChange={(value) => handlePreferenceChange('delivery', 'emailNotifications', value)}
            trackColor={{ false: '#767577', true: '#1E3A8A' }}
            thumbColor={localPreferences.delivery.emailNotifications ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>

      </View>
    </ScrollView>
  );
};

export default NotificationSettings;
