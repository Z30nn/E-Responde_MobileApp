import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from './firebaseConfig';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';
import { FirebaseService } from './services/firebaseService';
import { useAuth } from './services/authContext';
import CrimeReportForm from './CrimeReportForm';
import CrimeReportsList from './CrimeReportsList';
import CrimeReportDetail from './CrimeReportDetail';
import CrimeListFromOthers from './CrimeListFromOthers';
import ChangePassword from './ChangePassword';
import EmergencyContactsList from './components/emergency-contacts-list';
import NotificationSettings from './components/notification-settings';
import SOSAlertsHistory from './components/sos-alerts-history';
import { EmergencyContactsService } from './services/emergencyContactsService';
import { useNotification } from './services/notificationContext';
import { gyroscopeService } from './services/gyroscopeService';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(2);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const { isDarkMode, toggleTheme, fontSize, setFontSize } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout, user } = useAuth();
  // const { sendNotification } = useNotification();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];

  useEffect(() => {
    if (activeTab === 4) {
      loadUserProfile();
    }
  }, [activeTab]);


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
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const getInitials = () => {
    if (!userProfile) return '';
    return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
  };

  const tabs = [
    { id: 0, name: t('nav.crimeList'), icon: require('./assets/reports.png') },
    { id: 1, name: 'Contacts', icon: require('./assets/contacts.png') },
    { id: 2, name: 'SOS', icon: require('./assets/SOS.png') },
    { id: 3, name: t('nav.reports'), icon: require('./assets/WriteR.png') },
    { id: 4, name: t('nav.profile'), icon: require('./assets/Profile.png') },
  ];

  const handleTabPress = (tabId: number) => {
    setActiveTab(tabId);
  };

  const handleSOSPress = useCallback(async () => {
    try {
      setSosLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Check if user has primary contacts
      const contacts = await EmergencyContactsService.getUserEmergencyContacts(user.uid);
      const primaryContacts = contacts.filter(contact => contact.isPrimary);
      
      if (primaryContacts.length === 0) {
        Alert.alert(
          t('emergency.noPrimaryContacts') || 'No Primary Contacts',
          t('emergency.noPrimaryContactsDesc') || 'You need at least one primary emergency contact to send SOS alerts. Please add emergency contacts first.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        t('emergency.sosAlert') || 'SOS Alert',
        t('emergency.sosConfirm') || `This will send an SOS alert to ${primaryContacts.length} primary emergency contact(s). This is for real emergencies only. Continue?`,
        [
          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('emergency.sendSOS') || 'Send SOS',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await EmergencyContactsService.sendSOSAlert(
                  user.uid,
                  'EMERGENCY: I need immediate assistance!'
                );

                // Create an immediate severity crime report for SOS
                try {
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                    const userData = await FirebaseService.getCivilianUser(currentUser.uid);
                    const userName = userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User';
                    
                    const sosReport = {
                      crimeType: 'Emergency SOS',
                      dateTime: new Date(),
                      description: 'SOS Alert triggered - Immediate assistance required',
                      multimedia: [],
                      location: {
                        latitude: 0, // Will be updated with actual location
                        longitude: 0,
                        address: 'Location not available',
                      },
                      anonymous: false,
                      reporterName: userName,
                      reporterUid: currentUser.uid,
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                      severity: 'Immediate' as const,
                    };

                    await FirebaseService.submitCrimeReport(sosReport);
                    console.log('SOS: Emergency report created with Immediate severity');
                  }
                } catch (reportError) {
                  console.error('Error creating SOS report:', reportError);
                  // Don't fail the SOS if report creation fails
                }

                if (result.success) {
                  Alert.alert(
                    t('emergency.sosSent') || 'SOS Alert Sent',
                    t('emergency.sosSentDesc') || `SOS alert sent to ${result.sentTo} emergency contact(s).`,
                    [{ text: t('common.ok') || 'OK' }]
                  );
                } else {
                  Alert.alert(
                    t('common.error') || 'Error',
                    t('emergency.sosError') || 'Failed to send SOS alert.',
                    [{ text: t('common.ok') || 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Error sending SOS:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                Alert.alert(
                  t('common.error') || 'Error',
                  errorMessage || t('emergency.sosError') || 'Failed to send SOS alert.',
                  [{ text: t('common.ok') || 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleSOSPress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(t('common.error') || 'Error', errorMessage);
    } finally {
      setSosLoading(false);
    }
  }, [user, t]);

  // Gyroscope SOS functionality
  useEffect(() => {
    const handleGyroscopeSOS = () => {
      console.log('Dashboard: Gyroscope SOS triggered');
      handleSOSPress();
    };

    // Start gyroscope listening when component mounts
    gyroscopeService.startListening(handleGyroscopeSOS);

    // Cleanup on unmount
    return () => {
      gyroscopeService.stopListening();
    };
  }, [handleSOSPress]);

  const styles = StyleSheet.create({
    profileScrollView: {
      flex: 1,
      backgroundColor: theme.background,
    },
    profileContainer: {
      flex: 1,
      padding: 20,
    },

    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: theme.background,
      fontSize: fonts.title + 14,
      fontWeight: 'bold',
    },
    userName: {
      fontSize: fonts.title,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    userEmail: {
      fontSize: fonts.body,
      color: theme.secondaryText,
      textAlign: 'center',
      marginBottom: 16,
    },
    contactInfoBox: {
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      padding: 8,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    contactInfoItem: {
      marginBottom: 6,
    },
    contactInfoLabel: {
      color: '#6B7280',
      marginBottom: 4,
      fontWeight: '500',
    },
    contactInfoText: {
      color: '#1A1A1A',
      fontWeight: '600',
    },

    settingsContainer: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.secondaryText,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.settingsBackground,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuItemText: {
      fontSize: fonts.body,
      color: theme.text,
    },
    chevronRight: {
      fontSize: 20,
      color: theme.secondaryText,
    },
    themeSwitch: {
      transform: [{ scale: 1.2 }],
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mainContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    contentContainer: {
      alignItems: 'center',
      maxWidth: 400,
      width: '100%',
    },
    contentTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    contentText: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: theme.primary,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: 2,
      paddingHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 8,
      minHeight: 35,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginHorizontal: 2,
    },
    activeTabButton: {
      backgroundColor: isDarkMode ? 'rgba(147, 197, 253, 0.5)' : 'rgba(37, 99, 235, 0.8)',
    },
    tabIcon: {
      fontSize: 24,
      marginBottom: 4,
      color: theme.background,
    },
    tabIconImage: {
      width: 32,
      height: 32,
      marginBottom: 4,
      tintColor: theme.background,
      resizeMode: 'contain',
    },
    sosIconImage: {
      width: 48,
      height: 48,
      marginBottom: 4,
      resizeMode: 'contain',
      transform: [{ scale: 1.2 }],
    },
    activeTabIcon: {
      transform: [{ scale: 1.1 }],
    },
    tabLabel: {
      fontSize: 12,
      color: theme.background,
      fontWeight: '500',
      opacity: 0.8,
    },
    activeTabLabel: {
      color: theme.background,
      fontWeight: '600',
      opacity: 1,
    },
    logoutButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    logoutButton: {
      backgroundColor: '#FF0000',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      width: '60%',
      alignSelf: 'center',
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    logoutIcon: {
      width: 24,
      height: 24,
      tintColor: '#FFFFFF',
    },
    reportButton: {
      backgroundColor: '#D21414',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
      marginBottom: 20,
      width: '60%',
      alignSelf: 'center',
    },
    reportButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    reportsSection: {
      marginTop: 30,
      width: '100%',
      maxWidth: 400,
      flex: 1,
      minHeight: 400,
    },
    reportsSectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    reportsTabContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      paddingTop: 20,
    },
    crimeListTabContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      paddingTop: 20,
    },
    crimeListSection: {
      marginTop: 30,
      width: '100%',
      maxWidth: 400,
      flex: 1,
      minHeight: 400,
    },
    crimeListSectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      backgroundColor: '#F8F9FA',
      marginTop: 0,
    },
    sectionHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1A1A1A',
    },
    // Font Size Modal Styles
    fontSizePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fontSizePreviewText: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontSizeModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxWidth: '90%',
      minWidth: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: fonts.subtitle,
      color: theme.secondaryText,
      fontWeight: '600',
    },
    fontSizeOptions: {
      padding: 20,
    },
    fontSizeOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.menuBackground,
      marginBottom: 12,
    },
    fontSizeOptionSelected: {
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(30, 58, 138, 0.1)',
      borderColor: theme.primary,
    },
    fontSizeOptionText: {
      fontSize: fonts.subtitle,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    fontSizeOptionTextSelected: {
      color: theme.primary,
    },
    fontSizeDescription: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      lineHeight: 18,
    },
    fontSizeDescriptionSelected: {
      color: theme.primary,
      opacity: 0.8,
    },
    // Terms of Service Modal Styles
    termsModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: fontSize === 'large' ? '90%' : fontSize === 'medium' ? '88%' : '85%',
      minWidth: '90%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    termsContent: {
      padding: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      flex: 1,
      maxHeight: '100%',
    },
    termsSectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.primary,
      marginTop: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      marginBottom: fontSize === 'large' ? 12 : fontSize === 'medium' ? 10 : 8,
    },
    termsText: {
      fontSize: fonts.body,
      color: theme.text,
      lineHeight: fontSize === 'large' ? 28 : fontSize === 'medium' ? 25 : 22,
      marginBottom: fontSize === 'large' ? 20 : fontSize === 'medium' ? 18 : 16,
    },
    termsLastUpdated: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 10,
    },
    // Privacy and Policies Modal Styles
    privacyModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: fontSize === 'large' ? '90%' : fontSize === 'medium' ? '88%' : '85%',
      minWidth: '90%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    privacyContent: {
      padding: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      flex: 1,
      maxHeight: '100%',
    },
    privacySectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.primary,
      marginTop: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      marginBottom: fontSize === 'large' ? 12 : fontSize === 'medium' ? 10 : 8,
    },
    privacyText: {
      fontSize: fonts.body,
      color: theme.text,
      lineHeight: fontSize === 'large' ? 28 : fontSize === 'medium' ? 25 : 22,
      marginBottom: fontSize === 'large' ? 20 : fontSize === 'medium' ? 18 : 16,
    },
    privacyLastUpdated: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 10,
    },
    // Language Modal Styles
    languagePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    languagePreviewText: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontWeight: '500',
    },
    languageModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxWidth: '90%',
      minWidth: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    languageOptions: {
      padding: 20,
    },
    languageOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.menuBackground,
      marginBottom: 12,
    },
    languageOptionSelected: {
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(30, 58, 138, 0.1)',
      borderColor: theme.primary,
    },
    languageOptionText: {
      fontSize: fonts.subtitle,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    languageOptionTextSelected: {
      color: theme.primary,
    },
    languageOptionDesc: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      lineHeight: 18,
    },
    languageOptionDescSelected: {
      color: theme.primary,
      opacity: 0.8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
      marginTop: 16,
    },
    emergencyContactsContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    // Notification Settings Modal Styles
    modalContainer: {
      flex: 1,
    },
    modalHeaderSpacer: {
      width: 60, // Same width as close button to center title
    },
    modalCloseButton: {
      padding: 8,
    },
    modalCloseText: {
      fontSize: 16,
      fontWeight: '500',
    },
    sosButton: {
      width: 280,
      height: 280,
      borderRadius: 140,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 40,
      elevation: 15,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.5,
      shadowRadius: 10,
    },
    sosButtonIcon: {
      fontSize: 70,
      marginBottom: 15,
    },
    sosButtonText: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    sosButtonSubtext: {
      color: '#FFFFFF',
      fontSize: 18,
      opacity: 0.9,
    },
    sosHistoryContainer: {
      marginTop: 30,
      width: '100%',
      maxWidth: 400,
      height: 350, // Fixed height to make it scrollable
    },
    sosHistoryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <View style={styles.crimeListTabContainer}>
            <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle }]}>{t('dashboard.crimeList')}</Text>
            </View>
            <Text style={styles.contentText}>
              {t('dashboard.crimeListDesc')}
            </Text>
            
            <View style={styles.crimeListSection}>
              <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle }]}>{t('dashboard.recentCrimeReports')}</Text>
              </View>
              <CrimeListFromOthers onViewReport={(reportId) => setSelectedReportId(reportId)} />
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.emergencyContactsContainer}>
            {user ? (
              <EmergencyContactsList userId={user.uid} />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>
        );
      case 2:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Emergency</Text>
            <Text style={styles.contentText}>
              Quick access to emergency services and contacts.
            </Text>
            
            {/* SOS Button */}
            {user && (
              <TouchableOpacity
                style={[styles.sosButton, { backgroundColor: '#FF4444' }]}
                onPress={handleSOSPress}
                activeOpacity={0.8}
                disabled={sosLoading}
              >
                {sosLoading ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.sosButtonIcon}>🚨</Text>
                    <Text style={styles.sosButtonText}>SOS ALERT</Text>
                    <Text style={styles.sosButtonSubtext}>Press for Emergency</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* SOS Alerts History */}
            {user && (
              <View style={styles.sosHistoryContainer}>
                <Text style={styles.sosHistoryTitle}>Recent SOS Alerts</Text>
                <SOSAlertsHistory userId={user.uid} />
              </View>
            )}

          </View>
        );
      case 3:
        return (
          <View style={styles.reportsTabContainer}>
            <View style={styles.reportsSection}>
              <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border }]}>
                <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle }]}>{t('dashboard.yourCrimeReports')}</Text>
              </View>
              <CrimeReportsList onViewReport={(reportId) => setSelectedReportId(reportId)} />
            </View>
            
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setShowCrimeReportForm(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.reportButtonText}>{t('crime.reportCrime')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <ScrollView 
            style={styles.profileScrollView}
            showsVerticalScrollIndicator={false}>
            <View style={styles.profileContainer}>


              {/* Profile Info */}
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userProfile ? getInitials() : 'JD'}</Text>
              </View>
              <Text style={styles.userName}>
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'John Doe'}
              </Text>
              {/* Contact Information Box */}
              <View style={[styles.contactInfoBox, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}>
                <View style={styles.contactInfoItem}>
                  <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    {t('profile.email')}
                  </Text>
                  <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                    {userProfile?.email || 'JohnDoe@gmail.com'}
                  </Text>
                </View>
                
                {userProfile?.contactNumber && (
                  <View style={styles.contactInfoItem}>
                    <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      {t('profile.contactNumber')}
                    </Text>
                    <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                      {userProfile.contactNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Settings Menu */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowChangePassword(true)}
                >
                  <Text style={styles.menuItemText}>{t('auth.changePassword')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowNotificationModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.notifications')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('settings.darkMode')}</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={isDarkMode ? '#1E3A8A' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleTheme}
                    value={isDarkMode}
                    style={styles.themeSwitch}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowFontSizeModal(true)}
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
                  onPress={() => setShowLanguageModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.language')}</Text>
                  <View style={styles.languagePreview}>
                    <Text style={styles.languagePreviewText}>
                      {language === 'en' ? 'English' : 'Filipino'}
                    </Text>
                    <Text style={styles.chevronRight}>›</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowTermsModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.termsOfService')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowPrivacyModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.privacyPolicies')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Give Us Feedbacks</Text>
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
                      source={require('./assets/logout.png')} 
                      style={styles.logoutIcon}
                    />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.primary} />
      
      {showCrimeReportForm ? (
        <CrimeReportForm
          onClose={() => setShowCrimeReportForm(false)}
          onSuccess={() => {
            setShowCrimeReportForm(false);
          }}
        />
      ) : selectedReportId ? (
        <CrimeReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      ) : (
        <>
          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {renderTabContent()}
          </View>

          {/* Bottom Navigation Bar */}
          <View style={styles.bottomNav}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                {typeof tab.icon === 'string' ? (
                  <Text style={[
                    styles.tabIcon,
                    activeTab === tab.id && styles.activeTabIcon,
                  ]}>
                    {tab.icon}
                  </Text>
                ) : (
                  <Image
                    source={tab.icon}
                    style={[
                      tab.id === 2 ? styles.sosIconImage : styles.tabIconImage,
                      activeTab === tab.id && styles.activeTabIcon,
                    ]}
                  />
                )}
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.activeTabLabel,
                ]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* Font Size Modal */}
      <Modal
        visible={showFontSizeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFontSizeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFontSizeModal(false)}
        >
          <View style={styles.fontSizeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.fontSize')}</Text>
              <TouchableOpacity 
                onPress={() => setShowFontSizeModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.fontSizeOptions}>
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'small' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('small');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'small' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.small')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'small' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.smallDesc')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'medium' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('medium');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'medium' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.medium')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'medium' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.mediumDesc')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'large' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('large');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'large' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.large')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'large' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.largeDesc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTermsModal(false)}
        >
          <TouchableOpacity 
            style={styles.termsModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('terms.title')}</Text>
              <TouchableOpacity 
                onPress={() => setShowTermsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.termsContent} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.termsSectionTitle}>{t('terms.acceptance')}</Text>
              <Text style={styles.termsText}>
                {t('terms.acceptanceDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.description')}</Text>
              <Text style={styles.termsText}>
                {t('terms.descriptionDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.responsibilities')}</Text>
              <Text style={styles.termsText}>
                {t('terms.responsibilitiesDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.privacy')}</Text>
              <Text style={styles.termsText}>
                {t('terms.privacyDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.emergency')}</Text>
              <Text style={styles.termsText}>
                {t('terms.emergencyDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.liability')}</Text>
              <Text style={styles.termsText}>
                {t('terms.liabilityDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.modifications')}</Text>
              <Text style={styles.termsText}>
                {t('terms.modificationsDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.contact')}</Text>
              <Text style={styles.termsText}>
                {t('terms.contactDesc')}
              </Text>

              <Text style={styles.termsLastUpdated}>
                {t('terms.lastUpdated')} {new Date().toLocaleDateString()}
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Privacy and Policies Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(false)}
        >
          <TouchableOpacity 
            style={styles.privacyModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('privacy.title')}</Text>
              <TouchableOpacity 
                onPress={() => setShowPrivacyModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.privacyContent} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.privacySectionTitle}>{t('privacy.informationCollected')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.informationCollectedDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.howWeUse')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.howWeUseDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.informationSharing')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.informationSharingDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.dataSecurity')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.dataSecurityDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.dataRetention')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.dataRetentionDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.yourRights')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.yourRightsDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.locationServices')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.locationServicesDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.childrensPrivacy')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.childrensPrivacyDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.changesToPolicy')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.changesToPolicyDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.contactUs')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.contactUsDesc')}
              </Text>

              <Text style={styles.privacyLastUpdated}>
                {t('privacy.lastUpdated')} {new Date().toLocaleDateString()}
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'en' && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageOptionText,
                  language === 'en' && styles.languageOptionTextSelected
                ]}>English</Text>
                <Text style={[
                  styles.languageOptionDesc,
                  language === 'en' && styles.languageOptionDescSelected
                ]}>English language</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'fil' && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage('fil');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageOptionText,
                  language === 'fil' && styles.languageOptionTextSelected
                ]}>Filipino</Text>
                <Text style={[
                  styles.languageOptionDesc,
                  language === 'fil' && styles.languageOptionDescSelected
                ]}>Wikang Filipino</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#333' : '#E0E0E0' }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#1A1A1A' }]}>
              {t('notifications.settings')}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          <NotificationSettings />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Dashboard;