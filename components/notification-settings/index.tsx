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
import { useTheme, colors } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useNotification } from '../../services/notificationContext';
import { NotificationPreferences } from '../../services/types/notification-types';
import { createStyles } from './styles';

const NotificationSettings: React.FC = () => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { settings, isLoading, updatePreferences } = useNotification();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const theme = isDarkMode ? colors.dark : colors.light;
  const styles = createStyles(theme);

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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
        
        {fields.map((field) => (
          <View key={field.key} style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                {field.label}
              </Text>
              {field.description && (
                <Text style={styles.settingDescription}>
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  }

  if (!localPreferences) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {t('notifications.loadError')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('notifications.settings')}
        </Text>
        <Text style={styles.headerSubtitle}>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('notifications.delivery')}
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>
              {t('notifications.emailNotifications')}
            </Text>
            <Text style={styles.settingDescription}>
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
