import React, { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../../../../firebaseConfig';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import { FirebaseService } from '../../../../services/firebaseService';
import { useAuth } from '../../../../services/authContext';
import { gyroscopeService } from '../../../../services/gyroscopeService';
import { createStyles } from './styles';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
}

interface ProfileTabProps {
  onChangePassword: () => void;
  onFontSizeSettings: () => void;
  onLanguageSettings: () => void;
  onCleanupOldAlerts: () => void;
  onTermsOfService: () => void;
  onPrivacyPolicy: () => void;
  sosStats: {
    total: number;
    olderThanWeek: number;
    newerThanWeek: number;
  };
  cleanupLoading: boolean;
}

const ProfileTab: FC<ProfileTabProps> = ({
  onChangePassword,
  onFontSizeSettings,
  onLanguageSettings,
  onCleanupOldAlerts,
  onTermsOfService,
  onPrivacyPolicy,
  sosStats,
  cleanupLoading,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(true);
  const { isDarkMode, toggleTheme, fontSize } = useTheme();
  const { language, t } = useLanguage();
  const { logout } = useAuth();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  useEffect(() => {
    loadUserProfile();
    // Initialize gyroscope setting
    setGyroscopeEnabled(gyroscopeService.isGyroscopeEnabled());
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await FirebaseService.getCivilianUser(currentUser.uid);
      if (userData) {
        setUserProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          contactNumber: userData.contactNumber || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const getInitials = () => {
    if (!userProfile) return '';
    return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
  };

  const handleGyroscopeToggle = (value: boolean) => {
    setGyroscopeEnabled(value);
    gyroscopeService.setEnabled(value);
    console.log('Gyroscope SOS setting changed to:', value);
  };

  const isGyroscopeAvailable = gyroscopeService.isGyroscopeAvailable();

  return (
    <ScrollView
      style={styles.profileScrollView}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={false}
      bounces={true}
      alwaysBounceVertical={false}
    >
      <View style={styles.profileContainer}>
        {/* Profile Info */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{userProfile ? getInitials() : 'JD'}</Text>
        </View>
        <Text style={styles.userName}>
          {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'John Doe'}
        </Text>

        {/* Contact Information Box */}
        <View style={styles.contactInfoBox}>
          <View style={styles.contactInfoItem}>
            <Text style={styles.contactInfoLabel}>
              {t('profile.email')}
            </Text>
            <Text style={styles.contactInfoText}>
              {userProfile?.email || 'JohnDoe@gmail.com'}
            </Text>
          </View>

          {userProfile?.contactNumber && (
            <View style={styles.contactInfoItem}>
              <Text style={styles.contactInfoLabel}>
                {t('profile.contactNumber')}
              </Text>
              <Text style={styles.contactInfoText}>
                {userProfile.contactNumber}
              </Text>
            </View>
          )}
        </View>

        {/* Settings Menu */}
        <View style={styles.settingsContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onChangePassword}
          >
            <Text style={styles.menuItemText}>{t('auth.changePassword')}</Text>
            <Text style={styles.chevronRight}>›</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>SETTINGS</Text>

          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('settings.darkMode')}</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#f8f9ed' }}
              thumbColor={isDarkMode ? '#f8f9ed' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleTheme}
              value={isDarkMode}
              style={styles.themeSwitch}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.gyroscopeSettingContainer}>
              <Text style={styles.menuItemText}>Shake to SOS</Text>
              <Text style={styles.gyroscopeSettingDescription}>
                {isGyroscopeAvailable 
                  ? 'Enable shake detection for emergency SOS alerts'
                  : 'Gyroscope sensors not available on this device'
                }
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={gyroscopeEnabled ? '#f8f9ed' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleGyroscopeToggle}
              value={gyroscopeEnabled && isGyroscopeAvailable}
              disabled={!isGyroscopeAvailable}
              style={styles.gyroscopeSwitch}
            />
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={onFontSizeSettings}
          >
            <Text style={styles.menuItemText}>{t('settings.fontSize')}</Text>
            <View style={styles.fontSizePreview}>
              <Text style={styles.fontSizePreviewText}>
                {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
              </Text>
              <Text style={styles.chevronRight}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={onLanguageSettings}
          >
            <Text style={styles.menuItemText}>{t('settings.language')}</Text>
            <View style={styles.languagePreview}>
              <Text style={styles.languagePreviewText}>
                {language === 'en' ? 'English' : 'Filipino'}
              </Text>
              <Text style={styles.chevronRight}>›</Text>
            </View>
          </TouchableOpacity>

          {/* SOS Cleanup Option */}
          {sosStats.olderThanWeek > 0 && (
            <TouchableOpacity
              style={[styles.menuItem, styles.cleanupMenuItem]}
              onPress={onCleanupOldAlerts}
              disabled={cleanupLoading}
            >
              <View style={styles.cleanupInfo}>
                <Text style={styles.menuItemText}>{t('emergency.cleanOldAlerts')}</Text>
                <Text style={styles.cleanupSubtext}>
                  {t('emergency.alertsOlderThanWeek').replace('{count}', sosStats.olderThanWeek.toString())}
                </Text>
              </View>
              {cleanupLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.cleanupButton}>{t('emergency.cleanUp')}</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={onTermsOfService}
          >
            <Text style={styles.menuItemText}>{t('settings.termsOfService')}</Text>
            <Text style={styles.chevronRight}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={onPrivacyPolicy}
          >
            <Text style={styles.menuItemText}>{t('settings.privacyPolicies')}</Text>
            <Text style={styles.chevronRight}>›</Text>
          </TouchableOpacity>


          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButtonContainer}
            onPress={logout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutButton}>
              <Image
                source={require('../../../../assets/logout.png')}
                style={styles.logoutIcon}
              />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileTab;

