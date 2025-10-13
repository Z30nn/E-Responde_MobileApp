import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StatusBar,
  Image,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useAuth } from '../../services/authContext';
import { useNotification } from '../../services/notificationContext';
import { gyroscopeService } from '../../services/gyroscopeService';
import { sosCleanupService } from '../../services/sosCleanupService';
import CrimeReportForm from '../crime-report/form';
import CrimeReportDetail from '../crime-report/detail';
import ChangePassword from '../change-password';
import TermsOfService from '../terms-of-service';
import PrivacyPolicy from '../privacy-policy';
import { CrimeListFromOthersRef } from '../../CrimeListFromOthers';

// Tab Components
import HomeTab from './tabs/home-tab';
import ContactsTab from './tabs/contacts-tab';
import SOSTab from './tabs/sos-tab';
import ReportsTab from './tabs/reports-tab';
import NotificationsTab from './tabs/notifications-tab';
import ProfileTab from './tabs/profile-tab';

import { createStyles } from './styles';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(2);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedSOSAlertId, setSelectedSOSAlertId] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSOSInfoModal, setShowSOSInfoModal] = useState(false);
  const [sosStats, setSosStats] = useState({
    total: 0,
    olderThanWeek: 0,
    newerThanWeek: 0
  });
  const [showUserReportsFilterModal, setShowUserReportsFilterModal] = useState(false);
  const [selectedUserReportsStatus, setSelectedUserReportsStatus] = useState<string>('all');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const crimeListRef = useRef<CrimeListFromOthersRef>(null);
  const { isDarkMode, fontSize, setFontSize } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { notifications } = useNotification();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  // Load SOS alert statistics
  const loadSOSStats = useCallback(async () => {
    try {
      if (user) {
        const stats = await sosCleanupService.getUserSOSStats(user.uid);
        setSosStats(stats);
      }
    } catch (error: any) {
      console.error('Error loading SOS stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 5) {
      loadSOSStats();
    }
  }, [activeTab, loadSOSStats]);

  // Gyroscope SOS functionality
  useEffect(() => {
    const handleGyroscopeSOS = () => {
      console.log('Dashboard: Gyroscope SOS triggered');
      setActiveTab(2); // Switch to SOS tab
    };

    gyroscopeService.startListening(handleGyroscopeSOS);

    return () => {
      gyroscopeService.stopListening();
    };
  }, []);

  const tabs = [
    { id: 0, name: t('nav.crimeList'), icon: require('../../assets/reports.png') },
    { id: 1, name: 'Contacts', icon: require('../../assets/contacts.png') },
    { id: 2, name: 'SOS', icon: require('../../assets/SOS.png') },
    { id: 3, name: t('nav.reports'), icon: require('../../assets/WriteR.png') },
    { id: 4, name: 'Notifications', icon: require('../../assets/notif.png') },
    { id: 5, name: t('nav.profile'), icon: require('../../assets/Profile.png') },
  ];

  const handleTabPress = (tabId: number) => {
    setActiveTab(tabId);
  };

  const getUnreadCount = () => {
    if (!notifications) return 0;
    return notifications.filter(notification => !notification.data?.read).length;
  };

  const cleanupOldSOSAlerts = async () => {
    if (!user) return;

    Alert.alert(
      t('emergency.cleanOldAlerts'),
      t('emergency.cleanOldAlertsDesc').replace('{count}', sosStats.olderThanWeek.toString()),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('emergency.cleanUp'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCleanupLoading(true);
              const result = await sosCleanupService.cleanupUserSOSAlerts(user.uid);

              if (result.deleted > 0) {
                Alert.alert(
                  'Cleanup Complete',
                  `Successfully removed ${result.deleted} old SOS alerts.`
                );
                loadSOSStats();
              } else {
                Alert.alert(t('emergency.noOldAlerts'), t('emergency.noOldAlertsDesc'));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up old alerts. Please try again.');
            } finally {
              setCleanupLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleNavigateToScreen = (screen: string, params?: any) => {
    switch (screen) {
      case 'SOS':
        setActiveTab(2);
        if (params?.alertId) {
          setSelectedSOSAlertId(params.alertId);
        }
        break;
      case 'CrimeReportDetail':
        if (params?.reportId) {
          setSelectedReportId(params.reportId);
        }
        break;
      case 'Emergency':
        setActiveTab(2);
        break;
      case 'Settings':
        setActiveTab(5);
        break;
      case 'Community':
        setActiveTab(0);
        break;
      default:
        console.log('Unknown screen:', screen);
        break;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <HomeTab
            onViewReport={setSelectedReportId}
            crimeListRef={crimeListRef}
          />
        );
      case 1:
        return <ContactsTab userId={user?.uid || null} />;
      case 2:
        return (
          <SOSTab
            userId={user?.uid || ''}
            selectedAlertId={selectedSOSAlertId}
            onAlertSelected={setSelectedSOSAlertId}
            onShowInfo={() => setShowSOSInfoModal(true)}
          />
        );
      case 3:
        return (
          <ReportsTab
            onViewReport={setSelectedReportId}
            onCreateReport={() => setShowCrimeReportForm(true)}
            selectedStatus={selectedUserReportsStatus}
            onFilterPress={() => setShowUserReportsFilterModal(true)}
          />
        );
      case 4:
        return (
          <NotificationsTab
            userId={user?.uid || null}
            showNotificationMenu={showNotificationMenu}
            onToggleMenu={() => setShowNotificationMenu(!showNotificationMenu)}
            onNavigateToScreen={handleNavigateToScreen}
          />
        );
      case 5:
        return (
          <ProfileTab
            onChangePassword={() => setShowChangePassword(true)}
            onFontSizeSettings={() => setShowFontSizeModal(true)}
            onLanguageSettings={() => setShowLanguageModal(true)}
            onCleanupOldAlerts={cleanupOldSOSAlerts}
            onTermsOfService={() => setShowTermsModal(true)}
            onPrivacyPolicy={() => setShowPrivacyModal(true)}
            sosStats={sosStats}
            cleanupLoading={cleanupLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />

      {showCrimeReportForm ? (
        <CrimeReportForm
          onClose={() => setShowCrimeReportForm(false)}
          onSuccess={() => setShowCrimeReportForm(false)}
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
            {tabs.filter(tab => tab.id !== 2).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.regularTabButton,
                  activeTab === tab.id && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tabIconContainer}>
                  <Image
                    source={tab.icon}
                    style={[
                      tab.id === 4 ? styles.notificationIconImage : styles.tabIconImage,
                      activeTab === tab.id && styles.activeTabIconImage,
                    ]}
                  />
                  {tab.id === 4 && getUnreadCount() > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Center SOS FAB */}
            <TouchableOpacity
              style={[
                styles.sosFab,
                activeTab === 2 && styles.sosFabActive,
              ]}
              onPress={() => handleTabPress(2)}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/SOS.png')}
                style={styles.sosFabIcon}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modals */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}

      {showTermsModal && (
        <TermsOfService onClose={() => setShowTermsModal(false)} />
      )}

      {showPrivacyModal && (
        <PrivacyPolicy onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Font Size Modal */}
      {showFontSizeModal && (
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
      )}

      {/* Language Modal */}
      {showLanguageModal && (
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
      )}

      {/* Add other modals as needed (SOS Info, Filter) */}
    </View>
  );
};

export default Dashboard;

